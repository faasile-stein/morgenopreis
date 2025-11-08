import { supabase } from '../config/supabase';
import { logger } from '@traveltomorrow/shared';

export interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  session_id?: string;
  properties: Record<string, any>;
  timestamp?: Date;
}

/**
 * Track an analytics event
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    // Store in database
    await supabase.from('analytics_events').insert({
      event_type: event.event_type,
      user_id: event.user_id || null,
      session_id: event.session_id || null,
      properties: event.properties,
      timestamp: event.timestamp || new Date(),
    });

    logger.debug('Analytics event tracked', {
      event_type: event.event_type,
      user_id: event.user_id,
    });

    // In production, also send to external analytics service
    // await sendToMixpanel(event);
    // await sendToGA4(event);
  } catch (error) {
    logger.error('Error tracking analytics event:', error);
  }
}

/**
 * Track conversion funnel events
 */
export class FunnelTracker {
  /**
   * Wheel spin event
   */
  static async wheelSpin(userId: string | null, originAirport: string, destinationCount: number): Promise<void> {
    await trackEvent({
      event_type: 'wheel_spin',
      user_id: userId || undefined,
      properties: {
        origin_airport: originAirport,
        destinations_shown: destinationCount,
      },
    });
  }

  /**
   * Offer viewed
   */
  static async offerViewed(
    userId: string | null,
    offerId: string,
    price: number,
    currency: string,
    route: string
  ): Promise<void> {
    await trackEvent({
      event_type: 'offer_viewed',
      user_id: userId || undefined,
      properties: {
        offer_id: offerId,
        price,
        currency,
        route,
      },
    });
  }

  /**
   * Booking started
   */
  static async bookingStarted(userId: string, offerId: string, totalAmount: number): Promise<void> {
    await trackEvent({
      event_type: 'booking_started',
      user_id: userId,
      properties: {
        offer_id: offerId,
        total_amount: totalAmount,
      },
    });
  }

  /**
   * Booking completed
   */
  static async bookingCompleted(
    userId: string,
    bookingId: string,
    totalAmount: number,
    currency: string
  ): Promise<void> {
    await trackEvent({
      event_type: 'booking_completed',
      user_id: userId,
      properties: {
        booking_id: bookingId,
        total_amount: totalAmount,
        currency,
      },
    });
  }

  /**
   * Price alert created
   */
  static async alertCreated(userId: string, route: string, alertType: string): Promise<void> {
    await trackEvent({
      event_type: 'alert_created',
      user_id: userId,
      properties: {
        route,
        alert_type: alertType,
      },
    });
  }

  /**
   * Affiliate click
   */
  static async affiliateClick(
    userId: string | null,
    provider: string,
    destinationId: string | null
  ): Promise<void> {
    await trackEvent({
      event_type: 'affiliate_click',
      user_id: userId || undefined,
      properties: {
        provider,
        destination_id: destinationId,
      },
    });
  }
}

/**
 * Get funnel metrics for a date range
 */
export async function getFunnelMetrics(startDate: Date, endDate: Date): Promise<any> {
  try {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('event_type, user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!events) {
      return {
        wheel_spins: 0,
        offers_viewed: 0,
        bookings_started: 0,
        bookings_completed: 0,
        conversion_rate: 0,
      };
    }

    const wheelSpins = events.filter((e) => e.event_type === 'wheel_spin').length;
    const offersViewed = events.filter((e) => e.event_type === 'offer_viewed').length;
    const bookingsStarted = events.filter((e) => e.event_type === 'booking_started').length;
    const bookingsCompleted = events.filter((e) => e.event_type === 'booking_completed').length;

    return {
      wheel_spins: wheelSpins,
      offers_viewed: offersViewed,
      bookings_started: bookingsStarted,
      bookings_completed: bookingsCompleted,
      conversion_rate: wheelSpins > 0 ? (bookingsCompleted / wheelSpins) * 100 : 0,
      unique_users: new Set(events.map((e) => e.user_id).filter(Boolean)).size,
    };
  } catch (error) {
    logger.error('Error getting funnel metrics:', error);
    return null;
  }
}
