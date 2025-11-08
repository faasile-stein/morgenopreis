import { supabase } from '../config/supabase';
import { logger } from '@traveltomorrow/shared';
import { searchOffers, calculatePriceScore } from './offers.service';
import { addDays, addWeeks, format } from 'date-fns';

export interface WheelSpinParams {
  userId?: string;
  userLat?: number;
  userLng?: number;
  homeAirportIata?: string;
  preferences?: {
    budget?: 'low' | 'medium' | 'high';
    trip_type?: string[];
    max_flight_duration?: number;
  };
}

export interface WheelSpinResult {
  spin_id: string;
  destinations: DestinationOffer[];
  origin_airport: any;
  spin_timestamp: Date;
}

export interface DestinationOffer {
  destination: any;
  offers: any[];
  price_score: 'good' | 'fair' | 'poor';
  percentile: number;
  best_price: number;
  currency: string;
}

/**
 * Execute a wheel spin - selects destinations and fetches offers
 */
export async function spinWheel(params: WheelSpinParams): Promise<WheelSpinResult> {
  try {
    logger.info('Executing wheel spin', params);

    // 1. Determine origin airport
    const originAirport = await determineOriginAirport(params);
    if (!originAirport) {
      throw new Error('Could not determine origin airport');
    }

    logger.info(`Origin airport: ${originAirport.iata_code} (${originAirport.city})`);

    // 2. Select candidate destinations
    const candidateDestinations = await selectCandidateDestinations(originAirport.iata_code, params);

    if (candidateDestinations.length === 0) {
      throw new Error('No destinations available');
    }

    logger.info(`Selected ${candidateDestinations.length} candidate destinations`);

    // 3. Fetch offers for each destination
    const destinationOffers = await Promise.all(
      candidateDestinations.map((dest) => getDestinationOffers(originAirport.iata_code, dest, params))
    );

    // Filter out destinations with no offers
    const validOffers = destinationOffers.filter((d) => d.offers.length > 0);

    // 4. Record the spin in database
    const spinId = await recordWheelSpin(params.userId, originAirport.iata_code, validOffers);

    return {
      spin_id: spinId,
      destinations: validOffers,
      origin_airport: originAirport,
      spin_timestamp: new Date(),
    };
  } catch (error: any) {
    logger.error('Error executing wheel spin:', error);
    throw new Error(`Wheel spin failed: ${error.message}`);
  }
}

/**
 * Determine the origin airport based on user location or preferences
 */
async function determineOriginAirport(params: WheelSpinParams): Promise<any | null> {
  // 1. Use home airport if provided
  if (params.homeAirportIata) {
    const { data } = await supabase
      .from('airports')
      .select('*')
      .eq('iata_code', params.homeAirportIata)
      .eq('is_active', true)
      .single();

    if (data) return data;
  }

  // 2. Use geolocation to find nearest airport
  if (params.userLat && params.userLng) {
    const nearest = await findNearestAirport(params.userLat, params.userLng);
    if (nearest) return nearest;
  }

  // 3. Fallback to a popular default airport (Brussels for EU focus)
  const { data } = await supabase
      .from('airports')
      .select('*')
      .eq('iata_code', 'BRU')
      .single();

  return data;
}

/**
 * Find nearest airport using Haversine distance
 */
async function findNearestAirport(lat: number, lng: number): Promise<any | null> {
  try {
    // Get all active airports
    const { data: airports } = await supabase
      .from('airports')
      .select('*')
      .eq('is_active', true);

    if (!airports || airports.length === 0) return null;

    // Calculate distances and find nearest
    const airportsWithDistance = airports.map((airport) => ({
      ...airport,
      distance: calculateDistance(lat, lng, airport.latitude, airport.longitude),
    }));

    airportsWithDistance.sort((a, b) => a.distance - b.distance);

    return airportsWithDistance[0];
  } catch (error) {
    logger.error('Error finding nearest airport:', error);
    return null;
  }
}

/**
 * Haversine formula to calculate distance between two coordinates
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Select candidate destinations using a mix of algorithms
 */
async function selectCandidateDestinations(
  originIata: string,
  params: WheelSpinParams
): Promise<any[]> {
  try {
    let query = supabase
      .from('destinations')
      .select('*')
      .eq('is_published', true)
      .eq('is_featured', true); // Only featured destinations for wheel

    // Apply budget filter if specified
    if (params.preferences?.budget) {
      const budgetRanges = {
        low: [0, 300],
        medium: [200, 600],
        high: [500, 2000],
      };
      const [min, max] = budgetRanges[params.preferences.budget];
      query = query.gte('estimated_price_eur', min).lte('estimated_price_eur', max);
    }

    const { data: destinations } = await query.limit(10);

    if (!destinations || destinations.length === 0) {
      return [];
    }

    // Shuffle and pick 3 random destinations
    const shuffled = destinations.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  } catch (error) {
    logger.error('Error selecting candidate destinations:', error);
    return [];
  }
}

/**
 * Get offers for a specific destination
 */
async function getDestinationOffers(
  originIata: string,
  destination: any,
  params: WheelSpinParams
): Promise<DestinationOffer> {
  try {
    // Get destination airport (use primary airport)
    const { data: destAirport } = await supabase
      .from('airports')
      .select('*')
      .eq('iata_code', destination.primary_airport_iata)
      .single();

    if (!destAirport) {
      logger.warn(`No airport found for destination ${destination.name}`);
      return {
        destination,
        offers: [],
        price_score: 'fair',
        percentile: 50,
        best_price: 0,
        currency: 'EUR',
      };
    }

    // Search for offers (next 2 weeks, weekend trips)
    const departureDate = format(addWeeks(new Date(), 2), 'yyyy-MM-dd');
    const returnDate = format(addDays(new Date(departureDate), 3), 'yyyy-MM-dd');

    const offers = await searchOffers({
      originIataCode: originIata,
      destinationIataCode: destAirport.iata_code,
      departureDate,
      returnDate,
      cabin_class: 'economy',
    });

    if (offers.length === 0) {
      return {
        destination,
        offers: [],
        price_score: 'fair',
        percentile: 50,
        best_price: 0,
        currency: 'EUR',
      };
    }

    // Get best (cheapest) offer
    const bestOffer = offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))[0];

    // Calculate price score
    const routeKey = `${originIata}-${destAirport.iata_code}`;
    const priceScore = await calculatePriceScore(routeKey, parseFloat(bestOffer.total_amount));

    return {
      destination,
      offers: offers.slice(0, 3), // Return top 3 offers
      price_score: priceScore.score,
      percentile: priceScore.percentile,
      best_price: parseFloat(bestOffer.total_amount),
      currency: bestOffer.total_currency,
    };
  } catch (error) {
    logger.error(`Error getting offers for destination ${destination.name}:`, error);
    return {
      destination,
      offers: [],
      price_score: 'fair',
      percentile: 50,
      best_price: 0,
      currency: 'EUR',
    };
  }
}

/**
 * Record wheel spin in database for analytics
 */
async function recordWheelSpin(
  userId: string | undefined,
  originAirport: string,
  destinations: DestinationOffer[]
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('wheel_spins')
      .insert({
        user_id: userId || null,
        origin_airport: originAirport,
        destinations_shown: destinations.map((d) => d.destination.id),
        offers_shown_count: destinations.reduce((sum, d) => sum + d.offers.length, 0),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Error recording wheel spin:', error);
      return 'unknown';
    }

    return data.id;
  } catch (error) {
    logger.error('Error recording wheel spin:', error);
    return 'unknown';
  }
}
