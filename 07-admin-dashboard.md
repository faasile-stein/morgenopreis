# Stage 7: Admin Dashboard

## Overview
Build comprehensive admin dashboard for managing destinations, pricing, content, email campaigns, bookings, and analytics.

## Objectives
- Create admin authentication and role-based access
- Build destination management interface
- Implement pricing controls
- Create email campaign manager
- Build booking management
- Add analytics and reporting
- Implement audit logging

---

## 1. Admin Authentication & Roles

### Admin Middleware

**packages/api/src/middleware/admin-auth.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export async function logAdminAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changeData?: any,
  req?: Request
) {
  await prisma.adminAction.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      changeData,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
    },
  });
}
```

---

## 2. Destination Management

### Destination Admin Routes

**packages/api/src/routes/admin/destinations.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../../config/database';
import { requireRole } from '../../middleware/admin-auth';
import { logAdminAction } from '../../middleware/admin-auth';
import { body, validationResult } from 'express-validator';
import { drupalSyncService } from '../../services/drupal-sync.service';

const router = Router();

router.use(requireRole('EDITOR', 'ADMIN', 'SUPER_ADMIN'));

/**
 * GET /api/admin/destinations
 * List all destinations
 */
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search, isPublished } = req.query;

  const where: any = {};

  if (search) {
    where.OR = [
      { city: { contains: search as string, mode: 'insensitive' } },
      { country: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (isPublished !== undefined) {
    where.isPublished = isPublished === 'true';
  }

  const [destinations, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      include: {
        airport: true,
        _count: {
          select: {
            offers: true,
            wheelResults: true,
          },
        },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.destination.count({ where }),
  ]);

  res.json({
    destinations,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * POST /api/admin/destinations
 * Create destination
 */
router.post(
  '/',
  [
    body('city').notEmpty(),
    body('country').notEmpty(),
    body('airportId').notEmpty(),
    body('title').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const destination = await prisma.destination.create({
        data: {
          ...req.body,
          createdBy: (req as any).user.id,
          updatedBy: (req as any).user.id,
        },
      });

      await logAdminAction(
        (req as any).user.id,
        'destination.create',
        'destination',
        destination.id,
        destination,
        req
      );

      // Sync to Drupal if published
      if (destination.isPublished) {
        await drupalSyncService.syncDestination(destination.id);
      }

      res.status(201).json(destination);
    } catch (error) {
      console.error('Destination creation error:', error);
      res.status(500).json({ error: 'Failed to create destination' });
    }
  }
);

/**
 * PATCH /api/admin/destinations/:id
 * Update destination
 */
router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.destination.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    const updated = await prisma.destination.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        updatedBy: (req as any).user.id,
      },
    });

    await logAdminAction(
      (req as any).user.id,
      'destination.update',
      'destination',
      updated.id,
      { before: existing, after: updated },
      req
    );

    // Sync to Drupal if published
    if (updated.isPublished) {
      await drupalSyncService.syncDestination(updated.id);
    }

    res.json(updated);
  } catch (error) {
    console.error('Destination update error:', error);
    res.status(500).json({ error: 'Failed to update destination' });
  }
});

/**
 * DELETE /api/admin/destinations/:id
 * Delete destination
 */
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.destination.delete({
      where: { id: req.params.id },
    });

    await logAdminAction(
      (req as any).user.id,
      'destination.delete',
      'destination',
      req.params.id,
      null,
      req
    );

    res.json({ message: 'Destination deleted' });
  } catch (error) {
    console.error('Destination deletion error:', error);
    res.status(500).json({ error: 'Failed to delete destination' });
  }
});

export default router;
```

---

## 3. Pricing Management

**packages/api/src/routes/admin/pricing.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../../config/database';
import { requireRole } from '../../middleware/admin-auth';

const router = Router();

router.use(requireRole('PRICING_MANAGER', 'ADMIN', 'SUPER_ADMIN'));

/**
 * PATCH /api/admin/pricing/destinations/:id
 * Update destination base price
 */
router.patch('/destinations/:id', async (req, res) => {
  const { basePriceEur } = req.body;

  const updated = await prisma.destination.update({
    where: { id: req.params.id },
    data: { basePriceEur },
  });

  res.json(updated);
});

/**
 * GET /api/admin/pricing/thresholds
 * Get price badge thresholds
 */
router.get('/thresholds', async (req, res) => {
  // These could be stored in database or config
  const thresholds = {
    good: 70,  // Score >= 70 = GOOD
    fair: 40,  // Score >= 40 = FAIR
    poor: 0,   // Score < 40 = POOR
  };

  res.json(thresholds);
});

/**
 * PATCH /api/admin/pricing/thresholds
 * Update price badge thresholds
 */
router.patch('/thresholds', async (req, res) => {
  // TODO: Store in database
  res.json(req.body);
});

export default router;
```

---

## 4. Email Campaign Manager

**packages/api/src/routes/admin/campaigns.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../../config/database';
import { requireRole } from '../../middleware/admin-auth';
import { sendEmail } from '../../services/email.service';

const router = Router();

router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

/**
 * GET /api/admin/campaigns
 * List email campaigns
 */
router.get('/', async (req, res) => {
  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.json(campaigns);
});

/**
 * POST /api/admin/campaigns
 * Create campaign
 */
router.post('/', async (req, res) => {
  const campaign = await prisma.emailCampaign.create({
    data: {
      ...req.body,
      status: 'DRAFT',
      createdBy: (req as any).user.id,
    },
  });

  res.status(201).json(campaign);
});

/**
 * POST /api/admin/campaigns/:id/send
 * Send campaign
 */
router.post('/:id/send', async (req, res) => {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: req.params.id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Get recipients based on targeting
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      // Apply targeting filters
    },
  });

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: 'SENDING',
      recipientCount: users.length,
    },
  });

  // Send emails (use queue in production)
  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject: campaign.subject,
      template: 'campaign',
      data: { content: campaign.content },
    });
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  res.json({ message: 'Campaign sent' });
});

export default router;
```

---

## 5. Booking Management

**packages/api/src/routes/admin/bookings.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../../config/database';
import { requireRole } from '../../middleware/admin-auth';

const router = Router();

router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

/**
 * GET /api/admin/bookings
 * List all bookings
 */
router.get('/', async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { bookingReference: { contains: search as string } },
      { user: { email: { contains: search as string } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        offer: {
          include: {
            departureAirport: true,
            arrivalAirport: true,
            destination: true,
          },
        },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * GET /api/admin/bookings/:id
 * Get booking details
 */
router.get('/:id', async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      offer: {
        include: {
          departureAirport: true,
          arrivalAirport: true,
          destination: true,
        },
      },
    },
  });

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  res.json(booking);
});

/**
 * POST /api/admin/bookings/:id/refund
 * Process refund
 */
router.post('/:id/refund', async (req, res) => {
  // TODO: Integrate with Stripe refund API
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: {
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
    },
  });

  res.json(booking);
});

export default router;
```

---

## 6. Analytics Dashboard

**packages/api/src/routes/admin/analytics.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../../config/database';
import { requireRole } from '../../middleware/admin-auth';

const router = Router();

router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

/**
 * GET /api/admin/analytics/overview
 * Get overview stats
 */
router.get('/overview', async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {
    ...(startDate && { gte: new Date(startDate as string) }),
    ...(endDate && { lte: new Date(endDate as string) }),
  };

  const [
    totalBookings,
    totalRevenue,
    wheelSpins,
    activeAlerts,
    uniqueSpinners,
  ] = await Promise.all([
    prisma.booking.count({
      where: { createdAt: dateFilter },
    }),
    prisma.booking.aggregate({
      where: {
        status: 'CONFIRMED',
        createdAt: dateFilter,
      },
      _sum: { totalPaid: true },
    }),
    prisma.wheelSpin.count({
      where: { createdAt: dateFilter },
    }),
    prisma.priceAlert.count({
      where: { isActive: true },
    }),
    prisma.wheelSpin.findMany({
      where: { createdAt: dateFilter },
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);

  res.json({
    totalBookings,
    totalRevenue: totalRevenue._sum.totalPaid || 0,
    wheelSpins,
    activeAlerts,
    uniqueSpinners: uniqueSpinners.length,
    conversionRate: wheelSpins > 0 ? (totalBookings / wheelSpins) * 100 : 0,
  });
});

/**
 * GET /api/admin/analytics/funnel
 * Get conversion funnel
 */
router.get('/funnel', async (req, res) => {
  const { startDate, endDate } = req.query;

  const dateFilter = {
    ...(startDate && { gte: new Date(startDate as string) }),
    ...(endDate && { lte: new Date(endDate as string) }),
  };

  const [spins, offersViewed, offersClicked, bookings] = await Promise.all([
    prisma.wheelSpin.count({ where: { createdAt: dateFilter } }),
    prisma.wheelSpin.count({
      where: {
        createdAt: dateFilter,
        offersShown: { not: [] },
      },
    }),
    prisma.wheelSpin.count({
      where: {
        createdAt: dateFilter,
        didClickOffer: true,
      },
    }),
    prisma.booking.count({
      where: {
        createdAt: dateFilter,
        status: 'CONFIRMED',
      },
    }),
  ]);

  res.json({
    funnel: [
      { stage: 'Spins', count: spins, percentage: 100 },
      {
        stage: 'Offers Viewed',
        count: offersViewed,
        percentage: spins > 0 ? (offersViewed / spins) * 100 : 0,
      },
      {
        stage: 'Offers Clicked',
        count: offersClicked,
        percentage: spins > 0 ? (offersClicked / spins) * 100 : 0,
      },
      {
        stage: 'Bookings',
        count: bookings,
        percentage: spins > 0 ? (bookings / spins) * 100 : 0,
      },
    ],
  });
});

/**
 * GET /api/admin/analytics/destinations
 * Get destination performance
 */
router.get('/destinations', async (req, res) => {
  const destinations = await prisma.destination.findMany({
    where: { isPublished: true },
    include: {
      _count: {
        select: {
          wheelResults: true,
          offers: true,
        },
      },
    },
    orderBy: { wheelWinCount: 'desc' },
    take: 10,
  });

  res.json(destinations);
});

export default router;
```

---

## 7. Admin Web Dashboard

**packages/web/src/app/admin/layout.tsx:**
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Destinations', href: '/admin/destinations' },
    { name: 'Bookings', href: '/admin/bookings' },
    { name: 'Pricing', href: '/admin/pricing' },
    { name: 'Campaigns', href: '/admin/campaigns' },
    { name: 'Alerts', href: '/admin/alerts' },
    { name: 'Affiliates', href: '/admin/affiliates' },
    { name: 'Analytics', href: '/admin/analytics' },
    { name: 'Audit Log', href: '/admin/audit' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">TravelTomorrow Admin</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-5 px-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
```

**packages/web/src/app/admin/page.tsx:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      const data = await apiClient.get('/admin/analytics/overview');
      setStats(data);
    }
    loadStats();
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          change="+12%"
          trend="up"
        />
        <StatCard
          title="Revenue"
          value={`€${(stats.totalRevenue / 100).toFixed(0)}`}
          change="+8%"
          trend="up"
        />
        <StatCard
          title="Wheel Spins"
          value={stats.wheelSpins}
          change="+23%"
          trend="up"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          change="-2%"
          trend="down"
        />
      </div>

      {/* More dashboard content */}
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  trend,
}: {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div
        className={`text-sm ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {change}
      </div>
    </div>
  );
}
```

---

## Deliverables

- [ ] Admin authentication and role-based access
- [ ] Destination management interface
- [ ] Pricing controls
- [ ] Email campaign manager
- [ ] Booking management dashboard
- [ ] Analytics and reporting
- [ ] Audit logging system
- [ ] Admin tests (>80% coverage)

## Success Criteria

1. ✅ Admins can manage destinations
2. ✅ Pricing can be updated
3. ✅ Email campaigns can be sent
4. ✅ Bookings visible and manageable
5. ✅ Analytics dashboard functional
6. ✅ All actions logged
7. ✅ Role-based permissions enforced

## Timeline

**Estimated Duration:** 2-3 weeks

---

**Next Stage:** [08-testing-qa.md](./08-testing-qa.md)
