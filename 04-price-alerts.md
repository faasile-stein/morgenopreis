# Stage 4: Price Alerts & Monitoring

## Overview
Implement price history tracking, price scoring engine, and email/push notification system for price alerts.

## Objectives
- Build price history ingestion system
- Create price scoring algorithm
- Implement alert subscription system
- Build background worker for price checks
- Set up email and push notifications
- Create admin dashboard for alert management

---

## 1. Price History Tracking

### Price Ingestion Service

**packages/api/src/services/price-history.service.ts:**
```typescript
import { prisma } from '../config/database';
import { logger } from '@traveltomorrow/shared/logger';

export class PriceHistoryService {
  /**
   * Record price data point
   */
  async recordPrice(params: {
    routeKey: string;
    destinationId?: string;
    travelDate: Date;
    price: number;
    currency: string;
    source: string;
  }) {
    try {
      await prisma.priceHistory.create({
        data: {
          routeKey: params.routeKey,
          destinationId: params.destinationId,
          travelDate: params.travelDate,
          price: params.price,
          currency: params.currency,
          source: params.source,
        },
      });

      logger.info('Price recorded', params);
    } catch (error) {
      logger.error('Price recording error:', error);
    }
  }

  /**
   * Get price statistics for a route
   */
  async getPriceStats(routeKey: string, days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const history = await prisma.priceHistory.findMany({
      where: {
        routeKey,
        createdAt: { gte: cutoffDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (history.length === 0) {
      return null;
    }

    const prices = history.map(h => h.price);
    const sorted = [...prices].sort((a, b) => a - b);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.90)],
      dataPoints: history.length,
    };
  }

  /**
   * Calculate price score (0-100, higher is better)
   */
  calculatePriceScore(currentPrice: number, stats: any): number {
    if (!stats) return 50; // No historical data

    const range = stats.max - stats.min;
    if (range === 0) return 50;

    // Score based on percentile
    // Lower price = higher score
    const normalized = (stats.max - currentPrice) / range;
    const score = Math.round(normalized * 100);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get price badge based on score
   */
  getPriceBadge(score: number): 'GOOD' | 'FAIR' | 'POOR' {
    if (score >= 70) return 'GOOD';
    if (score >= 40) return 'FAIR';
    return 'POOR';
  }

  /**
   * Update offer with price score
   */
  async updateOfferScore(offerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) return;

    const routeKey = `${offer.departureAirportId}-${offer.arrivalAirportId}`;
    const stats = await this.getPriceStats(routeKey);

    if (stats) {
      const score = this.calculatePriceScore(offer.totalAmount, stats);
      const badge = this.getPriceBadge(score);

      await prisma.offer.update({
        where: { id: offerId },
        data: {
          priceScore: score,
          priceBadge: badge,
        },
      });

      logger.info('Offer score updated', { offerId, score, badge });
    }
  }

  /**
   * Batch update scores for all active offers
   */
  async updateAllOfferScores() {
    const offers = await prisma.offer.findMany({
      where: {
        expiresAt: { gt: new Date() },
      },
    });

    logger.info(`Updating scores for ${offers.length} offers`);

    for (const offer of offers) {
      await this.updateOfferScore(offer.id);
    }
  }
}

export const priceHistoryService = new PriceHistoryService();
```

---

## 2. Price Alert System

### Alert API Routes

**packages/api/src/routes/alerts.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * POST /api/alerts
 * Create price alert
 */
router.post(
  '/',
  authenticate,
  [
    body('routeKey').optional(),
    body('destinationId').optional(),
    body('departureDate').optional().isISO8601(),
    body('returnDate').optional().isISO8601(),
    body('thresholdPrice').optional().isInt(),
    body('thresholdPercent').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      routeKey,
      destinationId,
      departureDate,
      returnDate,
      thresholdPrice,
      thresholdPercent,
    } = req.body;

    if (!routeKey && !destinationId) {
      return res.status(400).json({
        error: 'Either routeKey or destinationId is required',
      });
    }

    try {
      const alert = await prisma.priceAlert.create({
        data: {
          userId: req.user!.id,
          routeKey,
          destinationId,
          departureDate: departureDate ? new Date(departureDate) : null,
          returnDate: returnDate ? new Date(returnDate) : null,
          thresholdPrice,
          thresholdPercent,
          isActive: true,
        },
      });

      res.status(201).json(alert);
    } catch (error) {
      console.error('Alert creation error:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
);

/**
 * GET /api/alerts
 * Get user's alerts
 */
router.get('/', authenticate, async (req, res) => {
  const alerts = await prisma.priceAlert.findMany({
    where: { userId: req.user!.id },
    include: {
      destination: {
        select: {
          id: true,
          city: true,
          country: true,
          heroImageUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(alerts);
});

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
router.delete('/:id', authenticate, async (req, res) => {
  const alert = await prisma.priceAlert.findUnique({
    where: { id: req.params.id },
  });

  if (!alert || alert.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  await prisma.priceAlert.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Alert deleted' });
});

/**
 * PATCH /api/alerts/:id
 * Update alert (pause/resume)
 */
router.patch('/:id', authenticate, async (req, res) => {
  const alert = await prisma.priceAlert.findUnique({
    where: { id: req.params.id },
  });

  if (!alert || alert.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  const updated = await prisma.priceAlert.update({
    where: { id: req.params.id },
    data: {
      isActive: req.body.isActive,
    },
  });

  res.json(updated);
});

export default router;
```

---

## 3. Background Worker for Alert Checking

### Alert Worker Service

**packages/api/src/workers/alert-worker.ts:**
```typescript
import { prisma } from '../config/database';
import { duffelService } from '../services/duffel.service';
import { priceHistoryService } from '../services/price-history.service';
import { sendEmail } from '../services/email.service';
import { logger } from '@traveltomorrow/shared/logger';

export class AlertWorker {
  private isRunning = false;

  /**
   * Check all active alerts
   */
  async checkAlerts() {
    if (this.isRunning) {
      logger.warn('Alert worker already running, skipping');
      return;
    }

    this.isRunning = true;
    logger.info('Starting alert worker');

    try {
      const alerts = await prisma.priceAlert.findMany({
        where: { isActive: true },
        include: {
          user: true,
          destination: {
            include: { airport: true },
          },
        },
      });

      logger.info(`Checking ${alerts.length} active alerts`);

      for (const alert of alerts) {
        await this.checkAlert(alert);
      }
    } catch (error) {
      logger.error('Alert worker error:', error);
    } finally {
      this.isRunning = false;
      logger.info('Alert worker complete');
    }
  }

  /**
   * Check individual alert
   */
  private async checkAlert(alert: any) {
    try {
      let shouldNotify = false;
      let currentPrice: number | null = null;
      let offer: any = null;

      // Determine route
      let routeKey = alert.routeKey;
      let origin: string;
      let destination: string;

      if (alert.destinationId && !routeKey) {
        // Need to determine user's nearest airport
        const userAirport = alert.user.homeAirportId || 'BRU'; // fallback
        routeKey = `${userAirport}-${alert.destination.airport.iataCode}`;
        origin = userAirport;
        destination = alert.destination.airport.iataCode;
      } else if (routeKey) {
        [origin, destination] = routeKey.split('-');
      } else {
        return; // Invalid alert
      }

      // Get current offers
      const departureDate = alert.departureDate ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 1 week from now

      const returnDate = alert.returnDate ||
        new Date(departureDate.getTime() + 2 * 24 * 60 * 60 * 1000); // Default: 2 days

      // Check cached offers first
      const cachedOffers = await duffelService.getCachedOffers({
        origin,
        destination,
        departureDate: departureDate.toISOString().split('T')[0],
        returnDate: returnDate.toISOString().split('T')[0],
        passengers: { adults: 1 },
      });

      if (cachedOffers.length > 0) {
        offer = cachedOffers[0]; // Cheapest offer
        currentPrice = offer.totalAmount;
      } else {
        // Search new offers (rate-limited)
        logger.info('No cached offers, searching Duffel', { routeKey });
        // Implement rate limiting here
        return; // Skip for now to avoid hitting API limits
      }

      // Check thresholds
      if (alert.thresholdPrice && currentPrice! <= alert.thresholdPrice) {
        shouldNotify = true;
      }

      if (alert.thresholdPercent) {
        // Check historical drop
        const stats = await priceHistoryService.getPriceStats(routeKey, 30);
        if (stats) {
          const drop = ((stats.avg - currentPrice!) / stats.avg) * 100;
          if (drop >= alert.thresholdPercent) {
            shouldNotify = true;
          }
        }
      }

      // Send notification if threshold met
      if (shouldNotify && currentPrice) {
        await this.sendAlertNotification(alert, offer, currentPrice);

        // Update alert
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: {
            lastNotifiedAt: new Date(),
            notificationCount: { increment: 1 },
          },
        });
      }
    } catch (error) {
      logger.error('Alert check error:', { alertId: alert.id, error });
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: any, offer: any, price: number) {
    logger.info('Sending price alert', {
      userId: alert.userId,
      price,
    });

    await sendEmail({
      to: alert.user.email,
      subject: `Price Drop Alert! ${alert.destination?.city || alert.routeKey}`,
      template: 'price_alert',
      data: {
        destination: alert.destination,
        price: (price / 100).toFixed(2),
        currency: offer.currency,
        departureDate: offer.outboundDate,
        returnDate: offer.returnDate,
        bookingUrl: `${process.env.WEB_URL}/checkout?offer=${offer.id}`,
      },
    });

    // TODO: Send push notification if mobile app
  }

  /**
   * Start scheduled worker
   */
  startScheduled(intervalMinutes: number = 60) {
    logger.info(`Starting alert worker with ${intervalMinutes}min interval`);

    setInterval(() => {
      this.checkAlerts();
    }, intervalMinutes * 60 * 1000);

    // Run immediately
    this.checkAlerts();
  }
}

export const alertWorker = new AlertWorker();

// Start if running as main module
if (require.main === module) {
  alertWorker.startScheduled(60); // Run every hour
}
```

---

## 4. Cron Job Setup

### Scheduled Tasks

**packages/api/src/cron.ts:**
```typescript
import cron from 'node-cron';
import { alertWorker } from './workers/alert-worker';
import { priceHistoryService } from './services/price-history.service';
import { logger } from '@traveltomorrow/shared/logger';

export function startCronJobs() {
  logger.info('Starting cron jobs');

  // Check price alerts every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron: Checking price alerts');
    await alertWorker.checkAlerts();
  });

  // Update offer scores every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Cron: Updating offer scores');
    await priceHistoryService.updateAllOfferScores();
  });

  // Clean up expired offers daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Cron: Cleaning expired offers');
    const result = await prisma.offer.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    logger.info(`Deleted ${result.count} expired offers`);
  });

  logger.info('Cron jobs started');
}
```

**Add to server.ts:**
```typescript
import { startCronJobs } from './cron';

// After app.listen
if (process.env.NODE_ENV === 'production') {
  startCronJobs();
}
```

---

## 5. Price Alert Email Template

**Enhance email service:**
```typescript
function generatePriceAlertEmail(data: {
  destination: any;
  price: string;
  currency: string;
  departureDate: string;
  returnDate: string;
  bookingUrl: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; padding: 30px; text-align: center; }
        .price-badge { background: #10b981; color: white; padding: 10px 20px;
                       border-radius: 25px; font-size: 24px; font-weight: bold; }
        .details { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .cta { background: #3b82f6; color: white; padding: 15px 30px;
               text-decoration: none; border-radius: 5px; display: inline-block;
               margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Price Drop Alert!</h1>
          <p>Your watched destination just got cheaper!</p>
        </div>

        <div style="padding: 20px;">
          <h2>${data.destination.city}, ${data.destination.country}</h2>

          <div class="price-badge">
            ${data.currency} ${data.price}
          </div>

          <div class="details">
            <p><strong>Departure:</strong> ${new Date(data.departureDate).toLocaleDateString()}</p>
            <p><strong>Return:</strong> ${new Date(data.returnDate).toLocaleDateString()}</p>
          </div>

          <p>This price won't last long! Book now to secure this deal.</p>

          <a href="${data.bookingUrl}" class="cta">
            Book Now
          </a>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            You're receiving this because you set up a price alert for this destination.
            <a href="${process.env.WEB_URL}/alerts">Manage your alerts</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## 6. Web Components for Alerts

**packages/web/src/components/Alerts/AlertForm.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface AlertFormProps {
  destinationId?: string;
  routeKey?: string;
  onSuccess: () => void;
}

export function AlertForm({ destinationId, routeKey, onSuccess }: AlertFormProps) {
  const [formData, setFormData] = useState({
    thresholdPrice: '',
    thresholdPercent: '20',
    departureDate: '',
    returnDate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/alerts', {
        destinationId,
        routeKey,
        thresholdPrice: formData.thresholdPrice ? parseInt(formData.thresholdPrice) * 100 : null,
        thresholdPercent: formData.thresholdPercent ? parseInt(formData.thresholdPercent) : null,
        departureDate: formData.departureDate || null,
        returnDate: formData.returnDate || null,
      });

      onSuccess();
    } catch (error) {
      console.error('Failed to create alert:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Alert me when price drops below (optional)
        </label>
        <input
          type="number"
          placeholder="€150"
          value={formData.thresholdPrice}
          onChange={(e) => setFormData({ ...formData, thresholdPrice: e.target.value })}
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Or when price drops by at least
        </label>
        <select
          value={formData.thresholdPercent}
          onChange={(e) => setFormData({ ...formData, thresholdPercent: e.target.value })}
          className="w-full px-4 py-2 border rounded"
        >
          <option value="10">10%</option>
          <option value="15">15%</option>
          <option value="20">20%</option>
          <option value="25">25%</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating Alert...' : 'Create Price Alert'}
      </button>
    </form>
  );
}
```

---

## 7. Admin Dashboard for Alerts

**packages/web/src/app/admin/alerts/page.tsx:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function AdminAlertsPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const data = await apiClient.get('/admin/alerts/stats');
      setStats(data);
    }
    loadStats();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Price Alerts Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Alerts" value={stats.totalAlerts} />
        <StatCard title="Active Alerts" value={stats.activeAlerts} />
        <StatCard title="Triggered Today" value={stats.triggeredToday} />
        <StatCard title="Avg. Alerts/User" value={stats.avgAlertsPerUser} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Alert Triggers</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Destination</th>
              <th className="text-left py-2">User</th>
              <th className="text-left py-2">Price</th>
              <th className="text-left py-2">Triggered</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentTriggers?.map((trigger: any) => (
              <tr key={trigger.id} className="border-b">
                <td className="py-2">{trigger.destination}</td>
                <td>{trigger.user}</td>
                <td>€{trigger.price}</td>
                <td>{new Date(trigger.triggeredAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}
```

---

## 8. Testing

**packages/api/__tests__/price-alerts.test.ts:**
```typescript
import { priceHistoryService } from '../src/services/price-history.service';
import { alertWorker } from '../src/workers/alert-worker';

describe('Price History Service', () => {
  it('should calculate price stats correctly', async () => {
    const stats = await priceHistoryService.getPriceStats('BRU-BCN', 30);
    expect(stats).toHaveProperty('min');
    expect(stats).toHaveProperty('max');
    expect(stats).toHaveProperty('avg');
  });

  it('should calculate price score', () => {
    const stats = { min: 10000, max: 20000, avg: 15000 };
    const score = priceHistoryService.calculatePriceScore(12000, stats);
    expect(score).toBeGreaterThan(50); // Good price
  });

  it('should assign correct price badge', () => {
    expect(priceHistoryService.getPriceBadge(80)).toBe('GOOD');
    expect(priceHistoryService.getPriceBadge(50)).toBe('FAIR');
    expect(priceHistoryService.getPriceBadge(30)).toBe('POOR');
  });
});
```

---

## Deliverables

- [ ] Price history tracking system
- [ ] Price scoring algorithm
- [ ] Alert subscription API
- [ ] Background worker for alert checking
- [ ] Email notifications for price drops
- [ ] Web components for alert management
- [ ] Admin dashboard for alerts
- [ ] Cron jobs configured
- [ ] Tests for price scoring (>80% coverage)

## Success Criteria

1. ✅ Price history records all searches
2. ✅ Price scores accurate based on historical data
3. ✅ Alerts trigger when thresholds met
4. ✅ Emails sent within 1 hour of trigger
5. ✅ Users can manage alerts via web
6. ✅ Admin can monitor alert performance
7. ✅ Worker runs reliably on schedule

## Timeline

**Estimated Duration:** 2 weeks

---

**Next Stage:** [05-affiliates-extras.md](./05-affiliates-extras.md)
