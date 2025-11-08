# Stage 5: Affiliates & Extras

## Overview
Integrate Booking.com affiliate links, add flight extras (luggage, seats), implement affiliate tracking and reporting.

## Objectives
- Set up Booking.com affiliate integration
- Build deep link generation for hotels
- Implement click tracking
- Add flight extras (luggage, seat selection)
- Create affiliate reporting dashboard
- Track conversion attribution

---

## 1. Booking.com Affiliate Integration

### Affiliate Service

**packages/api/src/services/booking-affiliate.service.ts:**
```typescript
import { prisma } from '../config/database';
import { logger } from '@traveltomorrow/shared/logger';

interface BookingDeepLinkParams {
  cityId: string;
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  rooms?: number;
}

export class BookingAffiliateService {
  private affiliateId: string;
  private baseUrl: string;

  constructor() {
    this.affiliateId = process.env.BOOKING_AFFILIATE_ID || '';
    this.baseUrl = 'https://www.booking.com/searchresults.html';
  }

  /**
   * Generate Booking.com deep link
   */
  generateDeepLink(params: BookingDeepLinkParams): string {
    const url = new URL(this.baseUrl);

    // Required parameters
    url.searchParams.set('aid', this.affiliateId);
    url.searchParams.set('ss', params.cityName);
    url.searchParams.set('checkin', params.checkIn);
    url.searchParams.set('checkout', params.checkOut);

    // Optional parameters
    if (params.adults) {
      url.searchParams.set('group_adults', params.adults.toString());
    }
    if (params.children) {
      url.searchParams.set('group_children', params.children.toString());
    }
    if (params.rooms) {
      url.searchParams.set('no_rooms', params.rooms.toString());
    }

    // Tracking parameters
    url.searchParams.set('label', 'traveltomorrow_' + params.cityId);

    return url.toString();
  }

  /**
   * Track affiliate click
   */
  async trackClick(params: {
    userId?: string;
    destinationId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }) {
    try {
      const deepLink = this.generateDeepLink({
        cityId: params.destinationId || '',
        cityName: '',
        checkIn: '',
        checkOut: '',
      });

      const click = await prisma.affiliateClick.create({
        data: {
          userId: params.userId,
          destinationId: params.destinationId,
          partner: 'booking',
          affiliateId: this.affiliateId,
          clickUrl: deepLink,
          sessionId: params.sessionId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          referrer: params.referrer,
        },
      });

      logger.info('Affiliate click tracked', { clickId: click.id });

      return click;
    } catch (error) {
      logger.error('Affiliate click tracking error:', error);
      throw error;
    }
  }

  /**
   * Get city ID from Booking.com (requires API access or manual mapping)
   */
  async getCityId(cityName: string): Promise<string | null> {
    // This would ideally use Booking.com API
    // For now, use a static mapping
    const cityMap: Record<string, string> = {
      'Barcelona': '-372490',
      'Paris': '-1456928',
      'Amsterdam': '-2140479',
      'Rome': '-126693',
      'Berlin': '-1746443',
      // Add more cities as needed
    };

    return cityMap[cityName] || null;
  }
}

export const bookingAffiliateService = new BookingAffiliateService();
```

---

## 2. Affiliate API Routes

**packages/api/src/routes/affiliates.ts:**
```typescript
import { Router } from 'express';
import { bookingAffiliateService } from '../services/booking-affiliate.service';
import { prisma } from '../config/database';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/affiliates/booking/link
 * Generate Booking.com affiliate link
 */
router.get('/booking/link', async (req, res) => {
  const { destinationId, checkIn, checkOut, adults, children, rooms } = req.query;

  try {
    const destination = await prisma.destination.findUnique({
      where: { id: destinationId as string },
    });

    if (!destination) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    const cityId = await bookingAffiliateService.getCityId(destination.city);

    if (!cityId) {
      return res.status(400).json({ error: 'City not supported' });
    }

    const deepLink = bookingAffiliateService.generateDeepLink({
      cityId,
      cityName: destination.city,
      checkIn: checkIn as string,
      checkOut: checkOut as string,
      adults: adults ? parseInt(adults as string) : 2,
      children: children ? parseInt(children as string) : 0,
      rooms: rooms ? parseInt(rooms as string) : 1,
    });

    // Track click
    const click = await bookingAffiliateService.trackClick({
      userId: (req as any).user?.id,
      destinationId: destination.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      referrer: req.get('referer'),
    });

    res.json({
      url: deepLink,
      clickId: click.id,
    });
  } catch (error) {
    console.error('Affiliate link generation error:', error);
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

/**
 * GET /api/affiliates/stats
 * Get affiliate performance stats (admin only)
 */
router.get('/stats', requireRole('ADMIN', 'PRICING_MANAGER'), async (req, res) => {
  const { startDate, endDate, partner } = req.query;

  try {
    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    }
    if (partner) {
      where.partner = partner;
    }

    const [clicks, conversions] = await Promise.all([
      prisma.affiliateClick.count({ where }),
      prisma.affiliateConversion.aggregate({
        where: {
          createdAt: where.createdAt,
          partner: where.partner,
        },
        _sum: {
          bookingValue: true,
          commission: true,
        },
        _count: true,
      }),
    ]);

    res.json({
      clicks,
      conversions: conversions._count,
      totalBookingValue: conversions._sum.bookingValue || 0,
      totalCommission: conversions._sum.commission || 0,
      conversionRate: clicks > 0 ? (conversions._count / clicks) * 100 : 0,
    });
  } catch (error) {
    console.error('Affiliate stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/**
 * POST /api/affiliates/conversions
 * Record affiliate conversion (webhook from Booking.com)
 */
router.post('/conversions', async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-booking-signature'];
  // TODO: Implement signature verification

  const { clickId, bookingValue, commission, currency, conversionDate } = req.body;

  try {
    await prisma.affiliateConversion.create({
      data: {
        clickId,
        partner: 'booking',
        bookingValue: Math.round(parseFloat(bookingValue) * 100),
        commission: Math.round(parseFloat(commission) * 100),
        currency,
        conversionDate: new Date(conversionDate),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Conversion recording error:', error);
    res.status(500).json({ error: 'Failed to record conversion' });
  }
});

export default router;
```

---

## 3. Flight Extras (Duffel)

### Extras Service

**packages/api/src/services/duffel-extras.service.ts:**
```typescript
import { duffelClient } from '@traveltomorrow/shared/clients/duffel';
import { logger } from '@traveltomorrow/shared/logger';

export class DuffelExtrasService {
  /**
   * Get available services for an offer (luggage, seats, etc.)
   */
  async getAvailableServices(offerId: string) {
    try {
      const services = await duffelClient.offerRequests.listAvailableServices(offerId);
      return services.data;
    } catch (error) {
      logger.error('Failed to fetch available services:', error);
      return [];
    }
  }

  /**
   * Get seat maps for flights
   */
  async getSeatMaps(offerId: string) {
    try {
      const seatMaps = await duffelClient.seatMaps.get(offerId);
      return seatMaps.data;
    } catch (error) {
      logger.error('Failed to fetch seat maps:', error);
      return null;
    }
  }

  /**
   * Add services to order
   */
  async addServicesToOrder(orderId: string, serviceIds: string[]) {
    try {
      const order = await duffelClient.orders.update(orderId, {
        services: serviceIds.map(id => ({ id })),
      });

      logger.info('Services added to order', { orderId, serviceIds });
      return order.data;
    } catch (error) {
      logger.error('Failed to add services:', error);
      throw new Error('Failed to add services to order');
    }
  }
}

export const duffelExtrasService = new DuffelExtrasService();
```

---

## 4. Extras API Routes

**packages/api/src/routes/extras.ts:**
```typescript
import { Router } from 'express';
import { duffelExtrasService } from '../services/duffel-extras.service';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/extras/offer/:offerId
 * Get available extras for an offer
 */
router.get('/offer/:offerId', async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.offerId },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const services = await duffelExtrasService.getAvailableServices(offer.duffelOfferId);

    res.json({ services });
  } catch (error) {
    console.error('Extras fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch extras' });
  }
});

/**
 * GET /api/extras/seats/:offerId
 * Get seat maps for an offer
 */
router.get('/seats/:offerId', async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.offerId },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const seatMaps = await duffelExtrasService.getSeatMaps(offer.duffelOfferId);

    res.json({ seatMaps });
  } catch (error) {
    console.error('Seat maps fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch seat maps' });
  }
});

/**
 * POST /api/extras/bookings/:bookingId/services
 * Add services to booking
 */
router.post('/bookings/:bookingId/services', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
    });

    if (!booking || booking.userId !== (req as any).user!.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { serviceIds } = req.body;

    const updatedOrder = await duffelExtrasService.addServicesToOrder(
      booking.duffelOrderId,
      serviceIds
    );

    // Update booking record
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        extrasData: updatedOrder.services,
        hasLuggage: updatedOrder.services.some((s: any) => s.type === 'baggage'),
        hasSeatSelection: updatedOrder.services.some((s: any) => s.type === 'seat'),
      },
    });

    res.json({ order: updatedOrder });
  } catch (error) {
    console.error('Add services error:', error);
    res.status(500).json({ error: 'Failed to add services' });
  }
});

export default router;
```

---

## 5. Web Components for Extras

**packages/web/src/components/Extras/LuggageSelector.tsx:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface LuggageSelectorProps {
  offerId: string;
  onSelect: (serviceIds: string[]) => void;
}

export function LuggageSelector({ offerId, onSelect }: LuggageSelectorProps) {
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await apiClient.get(`/extras/offer/${offerId}`);
        const baggageServices = data.services.filter((s: any) => s.type === 'baggage');
        setServices(baggageServices);
      } catch (error) {
        console.error('Failed to load luggage options:', error);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, [offerId]);

  const handleToggle = (serviceId: string) => {
    const newSelected = selected.includes(serviceId)
      ? selected.filter(id => id !== serviceId)
      : [...selected, serviceId];

    setSelected(newSelected);
    onSelect(newSelected);
  };

  if (loading) return <div>Loading luggage options...</div>;

  if (services.length === 0) {
    return <div className="text-gray-500">No additional luggage options available</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold mb-3">Add Luggage</h3>

      {services.map((service) => (
        <label
          key={service.id}
          className="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.includes(service.id)}
              onChange={() => handleToggle(service.id)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">{service.metadata.name}</div>
              <div className="text-sm text-gray-600">{service.metadata.description}</div>
            </div>
          </div>
          <div className="font-semibold">
            +€{(parseFloat(service.total_amount) ).toFixed(2)}
          </div>
        </label>
      ))}
    </div>
  );
}
```

**packages/web/src/components/Extras/SeatSelector.tsx:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface SeatSelectorProps {
  offerId: string;
  onSelect: (seatIds: string[]) => void;
}

export function SeatSelector({ offerId, onSelect }: SeatSelectorProps) {
  const [seatMaps, setSeatMaps] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSeatMaps() {
      try {
        const data = await apiClient.get(`/extras/seats/${offerId}`);
        setSeatMaps(data.seatMaps || []);
      } catch (error) {
        console.error('Failed to load seat maps:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSeatMaps();
  }, [offerId]);

  const handleSeatClick = (seatId: string) => {
    const newSelected = selectedSeats.includes(seatId)
      ? selectedSeats.filter(id => id !== seatId)
      : [...selectedSeats, seatId];

    setSelectedSeats(newSelected);
    onSelect(newSelected);
  };

  if (loading) return <div>Loading seat maps...</div>;

  if (seatMaps.length === 0) {
    return <div className="text-gray-500">Seat selection not available for this flight</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold mb-3">Select Your Seats</h3>

      {seatMaps.map((seatMap, index) => (
        <div key={index} className="border rounded p-4">
          <h4 className="font-medium mb-3">
            {seatMap.segment.origin.iata_code} → {seatMap.segment.destination.iata_code}
          </h4>

          <div className="seat-map">
            {/* Render seat grid - simplified */}
            <div className="grid grid-cols-6 gap-1">
              {seatMap.cabins[0]?.rows.map((row: any) =>
                row.sections[0]?.elements.map((element: any) => {
                  if (!element.designator) {
                    return <div key={element.id} className="w-10 h-10" />;
                  }

                  const isSelected = selectedSeats.includes(element.id);
                  const isAvailable = element.available_services?.length > 0;

                  return (
                    <button
                      key={element.id}
                      onClick={() => isAvailable && handleSeatClick(element.id)}
                      disabled={!isAvailable}
                      className={`
                        w-10 h-10 border rounded text-xs
                        ${isSelected ? 'bg-blue-600 text-white' : 'bg-white'}
                        ${!isAvailable ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-blue-100'}
                      `}
                    >
                      {element.designator}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Affiliate Reporting Dashboard

**packages/web/src/app/admin/affiliates/page.tsx:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AffiliateReportingPage() {
  const [stats, setStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    async function loadStats() {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const data = await apiClient.get('/affiliates/stats', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      setStats(data);
    }
    loadStats();
  }, [dateRange]);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Affiliate Performance</h1>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Clicks" value={stats.clicks} />
        <MetricCard title="Conversions" value={stats.conversions} />
        <MetricCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(2)}%`}
        />
        <MetricCard
          title="Total Commission"
          value={`€${(stats.totalCommission / 100).toFixed(2)}`}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Performance Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.timeSeries || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="clicks" stroke="#3b82f6" />
            <Line type="monotone" dataKey="conversions" stroke="#10b981" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}
```

---

## 7. Testing

**packages/api/__tests__/affiliates.test.ts:**
```typescript
import { bookingAffiliateService } from '../src/services/booking-affiliate.service';

describe('Booking Affiliate Service', () => {
  it('should generate valid deep link', () => {
    const link = bookingAffiliateService.generateDeepLink({
      cityId: '-372490',
      cityName: 'Barcelona',
      checkIn: '2024-06-01',
      checkOut: '2024-06-03',
      adults: 2,
    });

    expect(link).toContain('booking.com');
    expect(link).toContain('aid=');
    expect(link).toContain('ss=Barcelona');
    expect(link).toContain('checkin=2024-06-01');
  });

  it('should track affiliate click', async () => {
    const click = await bookingAffiliateService.trackClick({
      destinationId: 'test-dest-id',
      sessionId: 'test-session',
    });

    expect(click.partner).toBe('booking');
    expect(click.destinationId).toBe('test-dest-id');
  });
});
```

---

## Deliverables

- [ ] Booking.com affiliate integration
- [ ] Deep link generation service
- [ ] Click tracking system
- [ ] Duffel extras integration (luggage, seats)
- [ ] Extras selection components
- [ ] Affiliate reporting dashboard
- [ ] Conversion tracking webhook
- [ ] Tests for affiliate services (>80% coverage)

## Success Criteria

1. ✅ Affiliate links generate correctly
2. ✅ Clicks tracked with proper attribution
3. ✅ Users can add luggage and select seats
4. ✅ Affiliate dashboard shows accurate metrics
5. ✅ Conversions tracked from Booking.com
6. ✅ Commission calculations accurate
7. ✅ All tests pass

## Timeline

**Estimated Duration:** 1-2 weeks

---

**Next Stage:** [06-mobile-app.md](./06-mobile-app.md)
