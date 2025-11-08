import { supabase } from '../config/supabase';
import { logger } from '@traveltomorrow/shared';
import { searchOffers } from './offers.service';

export interface PriceHistoryEntry {
  route_key: string;
  origin: string;
  destination: string;
  departure_date: string;
  price: number;
  currency: string;
  source: string;
  created_at?: Date;
}

export interface PriceStatistics {
  route_key: string;
  current_price: number;
  average_30d: number;
  average_90d: number;
  min_30d: number;
  max_30d: number;
  percentile: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendation: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Record a price point in history
 */
export async function recordPriceHistory(entry: PriceHistoryEntry): Promise<void> {
  try {
    const { error } = await supabase.from('price_history').insert({
      route_key: entry.route_key,
      origin: entry.origin,
      destination: entry.destination,
      departure_date: entry.departure_date,
      price: entry.price.toString(),
      currency: entry.currency,
      source: entry.source,
    });

    if (error) {
      logger.error('Error recording price history:', error);
    } else {
      logger.debug(`Price recorded: ${entry.route_key} - ${entry.price} ${entry.currency}`);
    }
  } catch (error) {
    logger.error('Error recording price history:', error);
  }
}

/**
 * Record prices from offers automatically
 */
export async function recordOffersInHistory(offers: any[], origin: string, destination: string): Promise<void> {
  try {
    const entries: PriceHistoryEntry[] = offers.map((offer) => ({
      route_key: `${origin}-${destination}`,
      origin,
      destination,
      departure_date: offer.slices[0].segments[0].departing_at.split('T')[0],
      price: parseFloat(offer.total_amount),
      currency: offer.total_currency,
      source: 'duffel',
    }));

    for (const entry of entries) {
      await recordPriceHistory(entry);
    }

    logger.info(`Recorded ${entries.length} price history entries for ${origin}-${destination}`);
  } catch (error) {
    logger.error('Error recording offers in history:', error);
  }
}

/**
 * Get price statistics for a route
 */
export async function getPriceStatistics(
  routeKey: string,
  currentPrice?: number
): Promise<PriceStatistics | null> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get 30-day prices
    const { data: prices30d } = await supabase
      .from('price_history')
      .select('price, created_at')
      .eq('route_key', routeKey)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('price', { ascending: true });

    // Get 90-day prices
    const { data: prices90d } = await supabase
      .from('price_history')
      .select('price')
      .eq('route_key', routeKey)
      .gte('created_at', ninetyDaysAgo.toISOString());

    if (!prices30d || prices30d.length === 0) {
      return null;
    }

    const prices30dValues = prices30d.map((p) => parseFloat(p.price));
    const prices90dValues = prices90d ? prices90d.map((p) => parseFloat(p.price)) : [];

    const average30d = prices30dValues.reduce((a, b) => a + b, 0) / prices30dValues.length;
    const average90d =
      prices90dValues.length > 0
        ? prices90dValues.reduce((a, b) => a + b, 0) / prices90dValues.length
        : average30d;

    const min30d = Math.min(...prices30dValues);
    const max30d = Math.max(...prices30dValues);

    // Calculate trend
    const recentPrices = prices30d.slice(-7).map((p) => parseFloat(p.price));
    const olderPrices = prices30d.slice(0, 7).map((p) => parseFloat(p.price));
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (recentAvg > olderAvg * 1.05) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.95) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Calculate percentile
    const priceToCheck = currentPrice || recentPrices[recentPrices.length - 1];
    const position = prices30dValues.filter((p) => p <= priceToCheck).length;
    const percentile = (position / prices30dValues.length) * 100;

    // Recommendation
    let recommendation: 'excellent' | 'good' | 'fair' | 'poor';
    if (percentile <= 15 && trend !== 'increasing') {
      recommendation = 'excellent';
    } else if (percentile <= 35) {
      recommendation = 'good';
    } else if (percentile <= 65) {
      recommendation = 'fair';
    } else {
      recommendation = 'poor';
    }

    return {
      route_key: routeKey,
      current_price: priceToCheck,
      average_30d: average30d,
      average_90d: average90d,
      min_30d,
      max_30d,
      percentile,
      trend,
      recommendation,
    };
  } catch (error) {
    logger.error('Error getting price statistics:', error);
    return null;
  }
}

/**
 * Get price trend for a route (last 30 days)
 */
export async function getPriceTrend(routeKey: string, days: number = 30): Promise<any[]> {
  try {
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('price_history')
      .select('price, currency, created_at')
      .eq('route_key', routeKey)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    // Group by date and get average per day
    const dailyPrices = new Map<string, number[]>();

    data.forEach((entry) => {
      const date = entry.created_at.split('T')[0];
      if (!dailyPrices.has(date)) {
        dailyPrices.set(date, []);
      }
      dailyPrices.get(date)!.push(parseFloat(entry.price));
    });

    return Array.from(dailyPrices.entries()).map(([date, prices]) => ({
      date,
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: prices.length,
    }));
  } catch (error) {
    logger.error('Error getting price trend:', error);
    return [];
  }
}

/**
 * Clean up old price history (keep only last 12 months)
 */
export async function cleanupOldPriceHistory(): Promise<number> {
  try {
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('price_history')
      .delete()
      .lt('created_at', twelveMonthsAgo.toISOString())
      .select('id');

    if (error) {
      logger.error('Error cleaning up price history:', error);
      return 0;
    }

    const deletedCount = data ? data.length : 0;
    logger.info(`Cleaned up ${deletedCount} old price history entries`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up price history:', error);
    return 0;
  }
}
