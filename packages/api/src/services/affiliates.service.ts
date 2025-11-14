import { logger } from '@traveltomorrow/shared';
import crypto from 'crypto';

export interface AccommodationSearchParams {
  destinationCity: string;
  destinationCountry?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  rooms?: number;
}

export interface AffiliateLink {
  provider: 'booking.com' | 'other';
  url: string;
  tracking_params: Record<string, string>;
}

/**
 * Generate Booking.com affiliate deep link
 */
export function generateBookingComLink(params: AccommodationSearchParams): AffiliateLink {
  const affiliateId = process.env.BOOKING_AFFILIATE_ID || '';
  const baseUrl = 'https://www.booking.com/searchresults.html';

  // Build query parameters
  const queryParams = new URLSearchParams({
    aid: affiliateId, // Affiliate ID
    ss: params.destinationCity, // Search string (destination)
    checkin: params.checkIn,
    checkout: params.checkOut,
    group_adults: (params.adults || 2).toString(),
    group_children: (params.children || 0).toString(),
    no_rooms: (params.rooms || 1).toString(),
    selected_currency: 'EUR',
    lang: 'en-us',
    // Tracking parameters
    label: 'traveltomorrow-app',
    sid: generateSessionId(),
  });

  const url = `${baseUrl}?${queryParams.toString()}`;

  logger.info('Generated Booking.com affiliate link', {
    destination: params.destinationCity,
    checkIn: params.checkIn,
  });

  return {
    provider: 'booking.com',
    url,
    tracking_params: {
      aid: affiliateId,
      label: 'traveltomorrow-app',
    },
  };
}

/**
 * Generate Booking.com hotel deep link
 */
export function generateHotelLink(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  adults: number = 2
): AffiliateLink {
  const affiliateId = process.env.BOOKING_AFFILIATE_ID || '';
  const baseUrl = `https://www.booking.com/hotel/${hotelId}.html`;

  const queryParams = new URLSearchParams({
    aid: affiliateId,
    checkin: checkIn,
    checkout: checkOut,
    group_adults: adults.toString(),
    selected_currency: 'EUR',
    label: 'traveltomorrow-app',
  });

  const url = `${baseUrl}?${queryParams.toString()}`;

  return {
    provider: 'booking.com',
    url,
    tracking_params: {
      aid: affiliateId,
      hotel_id: hotelId,
    },
  };
}

/**
 * Track affiliate click for analytics
 */
export async function trackAffiliateClick(
  userId: string | null,
  provider: string,
  destinationId: string | null,
  metadata: Record<string, any>
): Promise<void> {
  try {
    // Log the click for analytics
    logger.info('Affiliate click tracked', {
      userId,
      provider,
      destinationId,
      timestamp: new Date().toISOString(),
    });

    // In production, send to analytics service (Mixpanel, GA4, etc.)
    // await analyticsService.track('affiliate_click', { ... });
  } catch (error) {
    logger.error('Error tracking affiliate click:', error);
  }
}

/**
 * Generate cryptographically secure session ID for tracking
 */
function generateSessionId(): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `tt-${timestamp}-${randomBytes}`;
}

/**
 * Get recommended hotels for a destination
 * (This would integrate with Booking.com API if available)
 */
export function getRecommendedHotels(destinationCity: string): any[] {
  // Placeholder - in production, integrate with Booking.com API
  // or maintain a curated list per destination
  logger.info(`Getting recommended hotels for ${destinationCity}`);

  return [
    {
      name: 'Featured Hotel',
      rating: 4.5,
      price_from: 89,
      currency: 'EUR',
      // booking_com_id would be used to generate deep link
    },
  ];
}
