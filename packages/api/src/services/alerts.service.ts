import { supabase } from '../config/supabase';
import { logger } from '@traveltomorrow/shared';
import { searchOffers } from './offers.service';
import { getPriceStatistics } from './priceHistory.service';

export interface CreateAlertParams {
  userId: string;
  origin: string;
  destination: string;
  departureDate?: string;
  maxPrice?: number;
  priceDropPercent?: number;
  alertType: 'price_threshold' | 'price_drop' | 'good_deal';
  isActive?: boolean;
}

export interface Alert {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  route_key: string;
  departure_date?: string;
  max_price?: number;
  price_drop_percent?: number;
  alert_type: string;
  is_active: boolean;
  last_checked_at?: Date;
  last_notified_at?: Date;
  created_at: Date;
}

/**
 * Create a price alert
 */
export async function createAlert(params: CreateAlertParams): Promise<Alert | null> {
  try {
    const routeKey = `${params.origin}-${params.destination}`;

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: params.userId,
        origin: params.origin,
        destination: params.destination,
        route_key: routeKey,
        departure_date: params.departureDate || null,
        max_price: params.maxPrice?.toString() || null,
        price_drop_percent: params.priceDropPercent || null,
        alert_type: params.alertType,
        is_active: params.isActive !== false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating alert:', error);
      return null;
    }

    logger.info(`Alert created: ${data.id} for route ${routeKey}`);
    return data as Alert;
  } catch (error) {
    logger.error('Error creating alert:', error);
    return null;
  }
}

/**
 * Get user's alerts
 */
export async function getUserAlerts(userId: string, activeOnly: boolean = false): Promise<Alert[]> {
  try {
    let query = supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error getting user alerts:', error);
      return [];
    }

    return (data as Alert[]) || [];
  } catch (error) {
    logger.error('Error getting user alerts:', error);
    return [];
  }
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting alert:', error);
      return false;
    }

    logger.info(`Alert deleted: ${alertId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting alert:', error);
    return false;
  }
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
  alertId: string,
  userId: string,
  isActive: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('price_alerts')
      .update({ is_active: isActive })
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error updating alert status:', error);
      return false;
    }

    logger.info(`Alert ${alertId} ${isActive ? 'activated' : 'deactivated'}`);
    return true;
  } catch (error) {
    logger.error('Error updating alert status:', error);
    return false;
  }
}

/**
 * Check all active alerts and trigger notifications
 */
export async function checkActiveAlerts(): Promise<number> {
  try {
    logger.info('Checking active alerts...');

    const { data: alerts, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('is_active', true);

    if (error || !alerts || alerts.length === 0) {
      logger.info('No active alerts to check');
      return 0;
    }

    logger.info(`Checking ${alerts.length} active alerts`);

    let triggeredCount = 0;

    for (const alert of alerts) {
      const shouldNotify = await checkAlert(alert as Alert);
      if (shouldNotify) {
        triggeredCount++;
      }

      // Update last_checked_at
      await supabase
        .from('price_alerts')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', alert.id);
    }

    logger.info(`${triggeredCount} alerts triggered`);
    return triggeredCount;
  } catch (error) {
    logger.error('Error checking active alerts:', error);
    return 0;
  }
}

/**
 * Check a single alert and trigger notification if conditions are met
 */
async function checkAlert(alert: Alert): Promise<boolean> {
  try {
    // Skip if notified recently (within last 24 hours)
    if (alert.last_notified_at) {
      const hoursSinceNotification =
        (Date.now() - new Date(alert.last_notified_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceNotification < 24) {
        logger.debug(`Alert ${alert.id} notified recently, skipping`);
        return false;
      }
    }

    // Search for offers
    const offers = await searchOffers({
      originIataCode: alert.origin,
      destinationIataCode: alert.destination,
      departureDate: alert.departure_date || undefined,
    });

    if (offers.length === 0) {
      logger.debug(`No offers found for alert ${alert.id}`);
      return false;
    }

    // Get best (cheapest) offer
    const bestOffer = offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))[0];
    const currentPrice = parseFloat(bestOffer.total_amount);

    let shouldTrigger = false;
    let reason = '';

    // Check alert conditions
    switch (alert.alert_type) {
      case 'price_threshold':
        if (alert.max_price && currentPrice <= parseFloat(alert.max_price)) {
          shouldTrigger = true;
          reason = `Price dropped to ${currentPrice} ${bestOffer.total_currency} (below ${alert.max_price})`;
        }
        break;

      case 'price_drop':
        // Check if price dropped by percentage
        const stats = await getPriceStatistics(alert.route_key, currentPrice);
        if (stats && alert.price_drop_percent) {
          const dropPercent = ((stats.average_30d - currentPrice) / stats.average_30d) * 100;
          if (dropPercent >= alert.price_drop_percent) {
            shouldTrigger = true;
            reason = `Price dropped ${dropPercent.toFixed(1)}% from 30-day average`;
          }
        }
        break;

      case 'good_deal':
        // Trigger when deal is in top 25% (excellent or good)
        const dealStats = await getPriceStatistics(alert.route_key, currentPrice);
        if (dealStats && (dealStats.recommendation === 'excellent' || dealStats.recommendation === 'good')) {
          shouldTrigger = true;
          reason = `Great deal found! ${dealStats.recommendation} price (${dealStats.percentile.toFixed(0)}th percentile)`;
        }
        break;
    }

    if (shouldTrigger) {
      logger.info(`Alert triggered: ${alert.id} - ${reason}`);

      // Send notification
      await sendAlertNotification(alert, bestOffer, reason);

      // Update last_notified_at
      await supabase
        .from('price_alerts')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', alert.id);

      return true;
    }

    return false;
  } catch (error) {
    logger.error(`Error checking alert ${alert.id}:`, error);
    return false;
  }
}

/**
 * Send alert notification to user
 */
async function sendAlertNotification(alert: Alert, offer: any, reason: string): Promise<void> {
  try {
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name')
      .eq('id', alert.user_id)
      .single();

    if (!user || !user.email) {
      logger.warn(`Cannot send notification for alert ${alert.id}: no user email`);
      return;
    }

    // Create notification record
    await supabase.from('notifications').insert({
      user_id: alert.user_id,
      type: 'price_alert',
      title: `Price Alert: ${alert.origin} → ${alert.destination}`,
      message: reason,
      data: {
        alert_id: alert.id,
        offer_id: offer.id,
        price: offer.total_amount,
        currency: offer.total_currency,
        route: `${alert.origin}-${alert.destination}`,
      },
      is_read: false,
    });

    // TODO: Send email notification
    // For now, just log it
    logger.info(`Notification created for user ${user.email}: ${reason}`);

    // In a real implementation, you would call an email service here:
    // await emailService.sendPriceAlert({
    //   to: user.email,
    //   firstName: user.first_name,
    //   origin: alert.origin,
    //   destination: alert.destination,
    //   price: offer.total_amount,
    //   currency: offer.total_currency,
    //   reason: reason,
    //   offerUrl: `${process.env.WEB_URL}/offers/${offer.id}`,
    // });
  } catch (error) {
    logger.error('Error sending alert notification:', error);
  }
}

/**
 * Get alert statistics for a user
 */
export async function getUserAlertStats(userId: string): Promise<any> {
  try {
    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId);

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'price_alert');

    return {
      total_alerts: alerts?.length || 0,
      active_alerts: alerts?.filter((a) => a.is_active).length || 0,
      total_notifications: notifications?.length || 0,
      unread_notifications: notifications?.filter((n) => !n.is_read).length || 0,
    };
  } catch (error) {
    logger.error('Error getting alert stats:', error);
    return {
      total_alerts: 0,
      active_alerts: 0,
      total_notifications: 0,
      unread_notifications: 0,
    };
  }
}
