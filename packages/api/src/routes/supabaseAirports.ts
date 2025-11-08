import { Router } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '@traveltomorrow/shared';
import axios from 'axios';

const router = Router();

// Haversine distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

async function getLocationFromIP(ip: string) {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 5000,
    });
    return {
      latitude: response.data.latitude,
      longitude: response.data.longitude,
    };
  } catch (error) {
    // Fallback to Brussels
    return {
      latitude: 50.8503,
      longitude: 4.3517,
    };
  }
}

/**
 * GET /api/airports
 * List all active airports with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { country, popular } = req.query;

    let query = supabase
      .from('airports')
      .select('*')
      .eq('is_active', true)
      .order('city', { ascending: true });

    if (country) {
      query = query.eq('country_code', country as string);
    }

    if (popular === 'true') {
      query = query.eq('is_popular', true);
    }

    const { data: airports, error } = await query;

    if (error) {
      logger.error('Failed to fetch airports', { error });
      return res.status(500).json({ error: 'Failed to fetch airports' });
    }

    res.json(airports);
  } catch (error) {
    logger.error('Airports endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/airports/nearest
 * Find nearest airports by location or IP
 */
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lon, limit } = req.query;
    const maxResults = limit ? parseInt(limit as string) : 5;

    let location;

    if (lat && lon) {
      location = {
        latitude: parseFloat(lat as string),
        longitude: parseFloat(lon as string),
      };
    } else {
      // Fallback to IP geolocation
      const ip = (req.ip || req.headers['x-forwarded-for']) as string;
      location = await getLocationFromIP(ip);
    }

    if (!location) {
      return res.status(400).json({ error: 'Could not determine location' });
    }

    // Fetch all active airports
    const { data: airports, error } = await supabase
      .from('airports')
      .select('*')
      .eq('is_active', true);

    if (error || !airports) {
      logger.error('Failed to fetch airports', { error });
      return res.status(500).json({ error: 'Failed to fetch airports' });
    }

    // Calculate distances and sort
    const airportsWithDistance = airports
      .map((airport) => ({
        ...airport,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          airport.latitude,
          airport.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);

    res.json(airportsWithDistance);
  } catch (error) {
    logger.error('Nearest airports error:', error);
    res.status(500).json({ error: 'Failed to find nearest airports' });
  }
});

/**
 * GET /api/airports/:iataCode
 * Get specific airport by IATA code
 */
router.get('/:iataCode', async (req, res) => {
  try {
    const iataCode = req.params.iataCode.toUpperCase();

    const { data: airport, error } = await supabase
      .from('airports')
      .select('*')
      .eq('iata_code', iataCode)
      .single();

    if (error || !airport) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    res.json(airport);
  } catch (error) {
    logger.error('Get airport error:', error);
    res.status(500).json({ error: 'Failed to fetch airport' });
  }
});

export default router;
