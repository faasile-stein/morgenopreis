import { duffel } from '../config/duffel';
import { supabase } from '../config/supabase';
import { getRedisClient } from '../config/redis';
import { logger } from '@traveltomorrow/shared';
import { addDays, addMonths, format } from 'date-fns';

export interface OfferSearchParams {
  originIataCode: string;
  destinationIataCode: string;
  departureDate?: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  passengers?: number;
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface CachedOffer {
  id: string;
  duffel_offer_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  total_amount: string;
  total_currency: string;
  cabin_class: string;
  stops: number;
  duration_minutes: number;
  carrier_name: string;
  fare_conditions: any;
  cached_at: Date;
  expires_at: Date;
  raw_offer: any;
}

/**
 * Search for flight offers via Duffel API
 */
export async function searchOffers(params: OfferSearchParams): Promise<any[]> {
  try {
    logger.info('Searching offers via Duffel', params);

    const departureDate = params.departureDate || format(addDays(new Date(), 14), 'yyyy-MM-dd');
    const returnDate = params.returnDate || format(addDays(new Date(), 16), 'yyyy-MM-dd');

    // Create offer request
    const offerRequest = await duffel.offerRequests.create({
      slices: [
        {
          origin: params.originIataCode,
          destination: params.destinationIataCode,
          departure_date: departureDate,
        },
        {
          origin: params.destinationIataCode,
          destination: params.originIataCode,
          departure_date: returnDate,
        },
      ],
      passengers: [
        {
          type: 'adult',
          given_name: 'Passenger', // Placeholder for search
          family_name: 'Name',
        },
      ],
      cabin_class: params.cabin_class || 'economy',
      return_offers: true,
    });

    logger.info(`Duffel offer request created: ${offerRequest.data.id}`);

    // Get offers from the request
    const offers = offerRequest.data.offers || [];

    // Cache offers in database and Redis
    await cacheOffers(offers, params.originIataCode, params.destinationIataCode);

    return offers;
  } catch (error: any) {
    logger.error('Error searching offers:', error);
    throw new Error(`Failed to search offers: ${error.message}`);
  }
}

/**
 * Cache offers in Supabase and Redis
 */
async function cacheOffers(
  offers: any[],
  origin: string,
  destination: string
): Promise<void> {
  try {
    const cachedOffers = offers.map((offer) => {
      const outboundSlice = offer.slices[0];
      const returnSlice = offer.slices[1];

      return {
        duffel_offer_id: offer.id,
        origin,
        destination,
        departure_date: outboundSlice.segments[0].departing_at,
        return_date: returnSlice ? returnSlice.segments[0].departing_at : null,
        total_amount: offer.total_amount,
        total_currency: offer.total_currency,
        cabin_class: offer.cabin_class || 'economy',
        stops: outboundSlice.segments.length - 1,
        duration_minutes: parseInt(outboundSlice.duration),
        carrier_name: outboundSlice.segments[0].operating_carrier.name,
        fare_conditions: offer.conditions,
        expires_at: new Date(offer.expires_at),
        raw_offer: offer,
      };
    });

    // Store in Supabase
    const { error } = await supabase.from('offers').insert(cachedOffers);

    if (error) {
      logger.error('Error caching offers in Supabase:', error);
    }

    // Also cache in Redis for fast access (TTL: 1 hour)
    const redis = getRedisClient();
    for (const offer of offers) {
      const cacheKey = `offer:${offer.id}`;
      await redis.setex(cacheKey, 3600, JSON.stringify(offer));
    }

    logger.info(`Cached ${offers.length} offers`);
  } catch (error) {
    logger.error('Error caching offers:', error);
  }
}

/**
 * Get a cached offer by Duffel offer ID
 */
export async function getCachedOffer(offerId: string): Promise<any | null> {
  try {
    // Try Redis first
    const redis = getRedisClient();
    const cached = await redis.get(`offer:${offerId}`);

    if (cached) {
      logger.info(`Offer ${offerId} found in Redis cache`);
      return JSON.parse(cached);
    }

    // Fallback to Supabase
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('duffel_offer_id', offerId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      logger.warn(`Offer ${offerId} not found or expired`);
      return null;
    }

    // Re-cache in Redis
    await redis.setex(`offer:${offerId}`, 3600, JSON.stringify(data.raw_offer));

    return data.raw_offer;
  } catch (error) {
    logger.error('Error getting cached offer:', error);
    return null;
  }
}

/**
 * Get the best offers for a destination (cheapest, fastest, best value)
 */
export async function getBestOffers(
  origin: string,
  destination: string,
  limit: number = 3
): Promise<CachedOffer[]> {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('origin', origin)
      .eq('destination', destination)
      .gt('expires_at', new Date().toISOString())
      .order('total_amount', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error getting best offers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error getting best offers:', error);
    return [];
  }
}

/**
 * Calculate price score (Good/Fair/Poor) based on historical data
 */
export async function calculatePriceScore(
  route: string,
  currentPrice: number
): Promise<{ score: 'good' | 'fair' | 'poor'; percentile: number }> {
  try {
    // Get historical prices for this route
    const { data, error } = await supabase
      .from('price_history')
      .select('price')
      .eq('route_key', route)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .order('price', { ascending: true });

    if (error || !data || data.length === 0) {
      // No historical data, assume fair
      return { score: 'fair', percentile: 50 };
    }

    const prices = data.map((p) => parseFloat(p.price));
    const position = prices.filter((p) => p <= currentPrice).length;
    const percentile = (position / prices.length) * 100;

    let score: 'good' | 'fair' | 'poor';
    if (percentile <= 25) {
      score = 'good'; // Top 25% cheapest
    } else if (percentile <= 60) {
      score = 'fair';
    } else {
      score = 'poor';
    }

    logger.info(`Price score for ${route}: ${score} (${percentile.toFixed(1)}th percentile)`);

    return { score, percentile };
  } catch (error) {
    logger.error('Error calculating price score:', error);
    return { score: 'fair', percentile: 50 };
  }
}
