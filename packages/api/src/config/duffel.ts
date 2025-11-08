import { Duffel } from '@duffel/api';
import { logger } from '@traveltomorrow/shared';

if (!process.env.DUFFEL_API_KEY) {
  logger.warn('DUFFEL_API_KEY not set - Duffel integration will not work');
}

/**
 * Duffel API client for flight search and booking
 *
 * API Reference: https://duffel.com/docs/api
 */
export const duffel = new Duffel({
  token: process.env.DUFFEL_API_KEY || '',
  debug: process.env.NODE_ENV === 'development',
});

/**
 * Check if Duffel is configured and accessible
 */
export async function checkDuffelConnection(): Promise<boolean> {
  try {
    if (!process.env.DUFFEL_API_KEY) {
      return false;
    }

    // Test connection by fetching airlines (lightweight API call)
    await duffel.airlines.list({ limit: 1 });
    return true;
  } catch (error) {
    logger.error('Duffel connection check failed:', error);
    return false;
  }
}
