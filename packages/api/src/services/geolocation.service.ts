import { prisma } from '../config/database';
import axios from 'axios';
import { Location, AirportWithDistance } from '@traveltomorrow/shared';

// Haversine distance formula
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

export async function findNearestAirports(
  location: Location,
  limit: number = 5
): Promise<AirportWithDistance[]> {
  const airports = await prisma.airport.findMany({
    where: { isActive: true },
  });

  const airportsWithDistance = airports.map((airport) => ({
    ...airport,
    distance: calculateDistance(
      location.latitude,
      location.longitude,
      airport.latitude,
      airport.longitude
    ),
  }));

  return airportsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

export async function getLocationFromIP(ip: string): Promise<Location | null> {
  try {
    // Use IP geolocation service (ipapi.co)
    const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
      timeout: 5000,
    });

    return {
      latitude: response.data.latitude,
      longitude: response.data.longitude,
    };
  } catch (error) {
    console.error('IP geolocation error:', error);
    // Return Brussels as default fallback
    return {
      latitude: 50.8503,
      longitude: 4.3517,
    };
  }
}
