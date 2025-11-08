import { Router } from 'express';
import { prisma } from '../config/database';
import {
  findNearestAirports,
  getLocationFromIP,
} from '../services/geolocation.service';

const router = Router();

// Get all active airports
router.get('/', async (req, res) => {
  const { country, popular } = req.query;

  const airports = await prisma.airport.findMany({
    where: {
      isActive: true,
      ...(country && { countryCode: country as string }),
      ...(popular === 'true' && { isPopular: true }),
    },
    orderBy: { city: 'asc' },
  });

  res.json(airports);
});

// Get nearest airports
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lon, limit } = req.query;

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

    const airports = await findNearestAirports(
      location,
      limit ? parseInt(limit as string) : 5
    );

    res.json(airports);
  } catch (error) {
    console.error('Nearest airports error:', error);
    res.status(500).json({ error: 'Failed to find nearest airports' });
  }
});

// Get airport by IATA code
router.get('/:iataCode', async (req, res) => {
  const airport = await prisma.airport.findUnique({
    where: { iataCode: req.params.iataCode.toUpperCase() },
  });

  if (!airport) {
    return res.status(404).json({ error: 'Airport not found' });
  }

  res.json(airport);
});

export default router;
