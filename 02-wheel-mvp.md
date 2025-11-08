# Stage 2: Wheel MVP & Duffel Integration

## Overview
Implement the core "Spin the Wheel" feature with Duffel API integration for flight search and booking. This is the primary user-facing feature that differentiates TravelTomorrow.

## Objectives
- Build interactive wheel UI (web)
- Integrate Duffel API for flight offers
- Implement offer caching and expiry
- Create booking flow
- Build checkout with Stripe
- Send confirmation emails

---

## 1. Wheel UI Component (Web)

### Wheel Component Structure
```
packages/web/
├── src/
│   ├── components/
│   │   ├── Wheel/
│   │   │   ├── WheelCanvas.tsx       # Animated wheel
│   │   │   ├── WheelSpinner.tsx      # Spin logic
│   │   │   ├── WheelResult.tsx       # Result display
│   │   │   └── wheel.styles.ts       # Styles
│   │   ├── Offers/
│   │   │   ├── OfferCard.tsx
│   │   │   ├── PriceBadge.tsx
│   │   │   └── OfferDetails.tsx
│   │   └── Checkout/
│   │       ├── CheckoutForm.tsx
│   │       ├── PassengerForm.tsx
│   │       └── PaymentForm.tsx
```

### Wheel Animation Component

**packages/web/src/components/Wheel/WheelCanvas.tsx:**
```typescript
'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Destination {
  id: string;
  city: string;
  country: string;
  heroImageUrl?: string;
}

interface WheelCanvasProps {
  destinations: Destination[];
  onSpin: () => void;
  onComplete: (destination: Destination) => void;
  isSpinning: boolean;
}

export function WheelCanvas({ destinations, onSpin, onComplete, isSpinning }: WheelCanvasProps) {
  const [rotation, setRotation] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const segmentAngle = 360 / destinations.length;

  const handleSpin = () => {
    if (isSpinning) return;

    onSpin();

    // Random destination selection
    const randomIndex = Math.floor(Math.random() * destinations.length);
    const targetRotation = 360 * 5 + (randomIndex * segmentAngle); // 5 full rotations + target

    setRotation(targetRotation);
    setSelectedIndex(randomIndex);

    // Trigger completion after animation
    setTimeout(() => {
      onComplete(destinations[randomIndex]);
    }, 4000);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Wheel container */}
      <motion.div
        className="relative aspect-square rounded-full overflow-hidden shadow-2xl"
        animate={{ rotate: rotation }}
        transition={{
          duration: 4,
          ease: [0.25, 0.1, 0.25, 1], // Custom easing for realistic spin
        }}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {destinations.map((dest, index) => {
            const angle = index * segmentAngle;
            const nextAngle = (index + 1) * segmentAngle;

            // Calculate path for pie segment
            const startX = 200 + 200 * Math.cos((angle - 90) * Math.PI / 180);
            const startY = 200 + 200 * Math.sin((angle - 90) * Math.PI / 180);
            const endX = 200 + 200 * Math.cos((nextAngle - 90) * Math.PI / 180);
            const endY = 200 + 200 * Math.sin((nextAngle - 90) * Math.PI / 180);

            const pathData = `
              M 200 200
              L ${startX} ${startY}
              A 200 200 0 0 1 ${endX} ${endY}
              Z
            `;

            const colors = [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
              '#98D8C8', '#FFD93D', '#6BCF7F', '#C77DFF',
            ];

            return (
              <g key={dest.id}>
                <path
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x="200"
                  y="200"
                  transform={`rotate(${angle + segmentAngle / 2} 200 200) translate(0 -120)`}
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {dest.city}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="200" cy="200" r="30" fill="white" stroke="#333" strokeWidth="2" />
        </svg>
      </motion.div>

      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-10">
        <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-red-500" />
      </div>

      {/* Spin button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20
                   bg-gradient-to-r from-purple-600 to-pink-600 text-white
                   px-8 py-4 rounded-full font-bold text-xl shadow-lg
                   hover:scale-110 transition-transform disabled:opacity-50"
      >
        {isSpinning ? 'Spinning...' : 'SPIN!'}
      </button>
    </div>
  );
}
```

### Wheel Container with API Integration

**packages/web/src/components/Wheel/WheelSpinner.tsx:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { WheelCanvas } from './WheelCanvas';
import { WheelResult } from './WheelResult';
import { apiClient } from '@/lib/api-client';

export function WheelSpinner() {
  const [destinations, setDestinations] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured destinations for wheel
  useEffect(() => {
    async function loadDestinations() {
      try {
        const data = await apiClient.get('/destinations/featured');
        setDestinations(data.slice(0, 12)); // Show 12 destinations on wheel
      } catch (error) {
        console.error('Failed to load destinations:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDestinations();
  }, []);

  const handleSpin = async () => {
    setIsSpinning(true);
    setResult(null);
    setOffers([]);
  };

  const handleSpinComplete = async (destination: any) => {
    try {
      // Call API to get offers for this destination
      const response = await apiClient.post('/wheel/spin', {
        destinationId: destination.id,
        preferences: {
          // Could include user preferences
        },
      });

      setResult(destination);
      setOffers(response.offers);
    } catch (error) {
      console.error('Failed to get offers:', error);
    } finally {
      setIsSpinning(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Loading destinations...</div>;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-center mb-8">
          Where will you go?
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          Spin the wheel and discover your next adventure!
        </p>

        <WheelCanvas
          destinations={destinations}
          onSpin={handleSpin}
          onComplete={handleSpinComplete}
          isSpinning={isSpinning}
        />

        {result && offers.length > 0 && (
          <WheelResult
            destination={result}
            offers={offers}
          />
        )}
      </div>
    </div>
  );
}
```

### Wheel Result Display

**packages/web/src/components/Wheel/WheelResult.tsx:**
```typescript
'use client';

import { motion } from 'framer-motion';
import { OfferCard } from '../Offers/OfferCard';

interface WheelResultProps {
  destination: any;
  offers: any[];
}

export function WheelResult({ destination, offers }: WheelResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-16"
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-4">
          🎉 You're going to {destination.city}!
        </h2>
        <p className="text-xl text-gray-600">
          {destination.shortDescription}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </motion.div>
  );
}
```

---

## 2. Duffel API Integration

### Duffel Service

**packages/api/src/services/duffel.service.ts:**
```typescript
import { duffelClient } from '@traveltomorrow/shared/clients/duffel';
import { prisma } from '../config/database';
import { logger } from '@traveltomorrow/shared/logger';
import { redis } from '../config/redis';

interface OfferSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export class DuffelService {
  /**
   * Search for flight offers via Duffel
   */
  async searchOffers(params: OfferSearchParams) {
    try {
      logger.info('Searching Duffel offers', params);

      const offerRequest = await duffelClient.offerRequests.create({
        slices: [
          {
            origin: params.origin,
            destination: params.destination,
            departure_date: params.departureDate,
          },
          ...(params.returnDate ? [{
            origin: params.destination,
            destination: params.origin,
            departure_date: params.returnDate,
          }] : []),
        ],
        passengers: [
          ...Array(params.passengers.adults).fill({ type: 'adult' }),
          ...Array(params.passengers.children || 0).fill({ type: 'child' }),
          ...Array(params.passengers.infants || 0).fill({ type: 'infant_without_seat' }),
        ],
        cabin_class: params.cabinClass || 'economy',
      });

      // Fetch offers from the request
      const offers = await duffelClient.offers.list({
        offer_request_id: offerRequest.data.id,
        sort: 'total_amount',
      });

      logger.info(`Found ${offers.data.length} offers from Duffel`);

      // Cache offers in database
      await this.cacheOffers(offers.data, params);

      return offers.data;
    } catch (error) {
      logger.error('Duffel search error:', error);
      throw new Error('Failed to search offers');
    }
  }

  /**
   * Cache offers in database with TTL
   */
  private async cacheOffers(duffelOffers: any[], searchParams: OfferSearchParams) {
    const cacheExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    for (const duffelOffer of duffelOffers.slice(0, 20)) { // Cache top 20 offers
      await prisma.offer.upsert({
        where: { duffelOfferId: duffelOffer.id },
        create: {
          duffelOfferId: duffelOffer.id,
          duffelOfferData: duffelOffer,
          departureAirportId: searchParams.origin,
          arrivalAirportId: searchParams.destination,
          outboundDate: new Date(searchParams.departureDate),
          returnDate: searchParams.returnDate ? new Date(searchParams.returnDate) : null,
          isRoundTrip: !!searchParams.returnDate,
          cabinClass: searchParams.cabinClass || 'economy',
          currency: duffelOffer.total_currency,
          totalAmount: Math.round(parseFloat(duffelOffer.total_amount) * 100),
          baseFare: Math.round(parseFloat(duffelOffer.base_amount || duffelOffer.total_amount) * 100),
          taxesAmount: Math.round(parseFloat(duffelOffer.tax_amount || '0') * 100),
          adultCount: searchParams.passengers.adults,
          childCount: searchParams.passengers.children || 0,
          infantCount: searchParams.passengers.infants || 0,
          isRefundable: duffelOffer.conditions?.refund_before_departure?.allowed || false,
          baggageAllowance: duffelOffer.conditions?.baggage_allowance,
          fareConditions: duffelOffer.conditions,
          cachedAt: new Date(),
          expiresAt: cacheExpiry,
        },
        update: {
          totalAmount: Math.round(parseFloat(duffelOffer.total_amount) * 100),
          cachedAt: new Date(),
          expiresAt: cacheExpiry,
        },
      });
    }
  }

  /**
   * Get cached offers (if still valid)
   */
  async getCachedOffers(params: OfferSearchParams) {
    const offers = await prisma.offer.findMany({
      where: {
        departureAirportId: params.origin,
        arrivalAirportId: params.destination,
        outboundDate: {
          gte: new Date(params.departureDate),
          lte: new Date(new Date(params.departureDate).getTime() + 24 * 60 * 60 * 1000),
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { totalAmount: 'asc' },
      take: 10,
    });

    return offers;
  }

  /**
   * Create booking order via Duffel
   */
  async createOrder(offerId: string, passengers: any[]) {
    try {
      const offer = await prisma.offer.findUnique({
        where: { duffelOfferId: offerId },
      });

      if (!offer || offer.expiresAt < new Date()) {
        throw new Error('Offer expired or not found');
      }

      const order = await duffelClient.orders.create({
        selected_offers: [offerId],
        passengers: passengers,
        payments: [{
          type: 'balance',
          currency: offer.currency,
          amount: (offer.totalAmount / 100).toFixed(2),
        }],
      });

      logger.info('Duffel order created', { orderId: order.data.id });

      return order.data;
    } catch (error) {
      logger.error('Duffel order creation error:', error);
      throw new Error('Failed to create order');
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    try {
      const order = await duffelClient.orders.get(orderId);
      return order.data;
    } catch (error) {
      logger.error('Duffel get order error:', error);
      throw new Error('Failed to retrieve order');
    }
  }
}

export const duffelService = new DuffelService();
```

---

## 3. Wheel API Endpoint

**packages/api/src/routes/wheel.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { duffelService } from '../services/duffel.service';
import { findNearestAirports } from '../services/geolocation.service';
import { logger } from '@traveltomorrow/shared/logger';

const router = Router();

/**
 * POST /api/wheel/spin
 * Generate offers for a wheel spin result
 */
router.post('/spin', async (req, res) => {
  try {
    const { destinationId, userLocation, preferences } = req.body;

    // Find nearest departure airport
    let departureAirport;
    if (userLocation) {
      const nearest = await findNearestAirports(userLocation, 1);
      departureAirport = nearest[0];
    } else {
      // Fallback to popular airport
      departureAirport = await prisma.airport.findFirst({
        where: { isPopular: true },
      });
    }

    if (!departureAirport) {
      return res.status(400).json({ error: 'Could not determine departure airport' });
    }

    // Get destination
    const destination = await prisma.destination.findUnique({
      where: { id: destinationId },
      include: { airport: true },
    });

    if (!destination || !destination.isPublished) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    // Calculate dates (upcoming weekend)
    const now = new Date();
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    const departureDate = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    const returnDate = new Date(departureDate.getTime() + 2 * 24 * 60 * 60 * 1000); // Sunday

    // Check cached offers first
    let offers = await duffelService.getCachedOffers({
      origin: departureAirport.iataCode,
      destination: destination.airport.iataCode,
      departureDate: departureDate.toISOString().split('T')[0],
      returnDate: returnDate.toISOString().split('T')[0],
      passengers: { adults: 1 },
    });

    // If no cached offers, search Duffel
    if (offers.length === 0) {
      logger.info('No cached offers, searching Duffel');

      const duffelOffers = await duffelService.searchOffers({
        origin: departureAirport.iataCode,
        destination: destination.airport.iataCode,
        departureDate: departureDate.toISOString().split('T')[0],
        returnDate: returnDate.toISOString().split('T')[0],
        passengers: { adults: 1 },
      });

      // Refresh cached offers
      offers = await duffelService.getCachedOffers({
        origin: departureAirport.iataCode,
        destination: destination.airport.iataCode,
        departureDate: departureDate.toISOString().split('T')[0],
        returnDate: returnDate.toISOString().split('T')[0],
        passengers: { adults: 1 },
      });
    }

    // Log wheel spin
    await prisma.wheelSpin.create({
      data: {
        userId: req.user?.id,
        departureAirportId: departureAirport.iataCode,
        resultDestinationId: destination.id,
        offersShown: offers.slice(0, 3).map(o => ({
          id: o.id,
          price: o.totalAmount,
        })),
        sessionId: req.sessionID,
        ipAddress: req.ip,
      },
    });

    // Update destination stats
    await prisma.destination.update({
      where: { id: destination.id },
      data: {
        wheelWinCount: { increment: 1 },
      },
    });

    res.json({
      destination,
      departureAirport: {
        iataCode: departureAirport.iataCode,
        name: departureAirport.name,
        city: departureAirport.city,
      },
      offers: offers.slice(0, 3).map(offer => ({
        id: offer.id,
        duffelOfferId: offer.duffelOfferId,
        totalAmount: offer.totalAmount,
        currency: offer.currency,
        outboundDate: offer.outboundDate,
        returnDate: offer.returnDate,
        priceScore: offer.priceScore,
        priceBadge: offer.priceBadge,
      })),
      suggestedDates: {
        departure: departureDate,
        return: returnDate,
      },
    });
  } catch (error) {
    logger.error('Wheel spin error:', error);
    res.status(500).json({ error: 'Failed to process spin' });
  }
});

export default router;
```

---

## 4. Booking Flow

### Booking API Routes

**packages/api/src/routes/bookings.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { duffelService } from '../services/duffel.service';
import { authenticate } from '../middleware/auth';
import { createPaymentIntent } from '../services/payment.service';
import { sendBookingConfirmation } from '../services/email.service';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post(
  '/',
  authenticate,
  [
    body('offerId').notEmpty(),
    body('passengers').isArray({ min: 1 }),
    body('paymentMethodId').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { offerId, passengers, paymentMethodId } = req.body;
      const userId = req.user!.id;

      // Get offer
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: {
          departureAirport: true,
          arrivalAirport: true,
        },
      });

      if (!offer || offer.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Offer expired or not found' });
      }

      // Create Duffel order
      const duffelOrder = await duffelService.createOrder(
        offer.duffelOfferId,
        passengers
      );

      // Create payment intent
      const paymentIntent = await createPaymentIntent({
        amount: offer.totalAmount,
        currency: offer.currency,
        customerId: userId,
        paymentMethodId,
      });

      // Create booking record
      const booking = await prisma.booking.create({
        data: {
          userId,
          offerId: offer.id,
          duffelOrderId: duffelOrder.id,
          duffelOrderData: duffelOrder,
          passengers,
          paymentIntentId: paymentIntent.id,
          paymentStatus: 'PENDING',
          totalPaid: offer.totalAmount,
          currency: offer.currency,
          status: 'PENDING',
          ticketingStatus: 'NOT_ISSUED',
        },
      });

      res.status(201).json({
        booking: {
          id: booking.id,
          status: booking.status,
          totalPaid: booking.totalPaid,
          currency: booking.currency,
        },
        paymentIntent: {
          clientSecret: paymentIntent.client_secret,
        },
      });
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }
);

/**
 * POST /api/bookings/:id/confirm
 * Confirm booking after successful payment
 */
router.post('/:id/confirm', authenticate, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        offer: {
          include: {
            departureAirport: true,
            arrivalAirport: true,
          },
        },
      },
    });

    if (!booking || booking.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        confirmedAt: new Date(),
      },
    });

    // Send confirmation email
    await sendBookingConfirmation({
      to: booking.user.email,
      booking: updatedBooking,
      offer: booking.offer,
    });

    res.json({ booking: updatedBooking });
  } catch (error) {
    console.error('Booking confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', authenticate, async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      offer: {
        include: {
          departureAirport: true,
          arrivalAirport: true,
          destination: true,
        },
      },
    },
  });

  if (!booking || booking.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  res.json(booking);
});

/**
 * GET /api/bookings
 * Get user's bookings
 */
router.get('/', authenticate, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: {
      offer: {
        include: {
          departureAirport: true,
          arrivalAirport: true,
          destination: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(bookings);
});

export default router;
```

---

## 5. Payment Integration (Stripe)

**packages/api/src/services/payment.service.ts:**
```typescript
import Stripe from 'stripe';
import { logger } from '@traveltomorrow/shared/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface PaymentIntentParams {
  amount: number; // In cents
  currency: string;
  customerId: string;
  paymentMethodId?: string;
}

export async function createPaymentIntent(params: PaymentIntentParams) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        customerId: params.customerId,
      },
    });

    logger.info('Payment intent created', { id: paymentIntent.id });

    return paymentIntent;
  } catch (error) {
    logger.error('Payment intent creation error:', error);
    throw new Error('Failed to create payment intent');
  }
}

export async function confirmPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Payment confirmation error:', error);
    throw new Error('Failed to confirm payment');
  }
}

export async function createCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    });

    return customer;
  } catch (error) {
    logger.error('Customer creation error:', error);
    throw new Error('Failed to create customer');
  }
}
```

---

## 6. Checkout Component (Web)

**packages/web/src/components/Checkout/CheckoutForm.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { PassengerForm } from './PassengerForm';
import { apiClient } from '@/lib/api-client';

interface CheckoutFormProps {
  offer: any;
  onSuccess: (booking: any) => void;
}

export function CheckoutForm({ offer, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [passengers, setPassengers] = useState([
    { type: 'adult', title: 'Mr', firstName: '', lastName: '', dateOfBirth: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Create booking
      const bookingResponse = await apiClient.post('/bookings', {
        offerId: offer.id,
        passengers,
      });

      // Confirm payment
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/bookings/${bookingResponse.booking.id}/success`,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      // Confirm booking
      await apiClient.post(`/bookings/${bookingResponse.booking.id}/confirm`);

      onSuccess(bookingResponse.booking);
    } catch (err: any) {
      setError(err.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Passenger Details</h2>
        {passengers.map((passenger, index) => (
          <PassengerForm
            key={index}
            passenger={passenger}
            onChange={(updated) => {
              const newPassengers = [...passengers];
              newPassengers[index] = updated;
              setPassengers(newPassengers);
            }}
          />
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Payment</h2>
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg
                   hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? 'Processing...' : `Pay €${(offer.totalAmount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}
```

---

## 7. Email Service

**packages/api/src/services/email.service.ts:**
```typescript
import sgMail from '@sendgrid/mail';
import { logger } from '@traveltomorrow/shared/logger';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailParams {
  to: string;
  subject: string;
  template: string;
  data: any;
}

export async function sendEmail(params: EmailParams) {
  try {
    const templates = {
      welcome: generateWelcomeEmail,
      booking_confirmation: generateBookingConfirmationEmail,
      price_alert: generatePriceAlertEmail,
    };

    const templateFn = templates[params.template as keyof typeof templates];
    if (!templateFn) {
      throw new Error(`Unknown template: ${params.template}`);
    }

    const html = templateFn(params.data);

    await sgMail.send({
      to: params.to,
      from: process.env.EMAIL_FROM || 'noreply@traveltomorrow.be',
      subject: params.subject,
      html,
    });

    logger.info('Email sent', { to: params.to, template: params.template });
  } catch (error) {
    logger.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
}

function generateWelcomeEmail(data: { firstName?: string }) {
  return `
    <h1>Welcome to TravelTomorrow, ${data.firstName || 'traveler'}!</h1>
    <p>We're excited to help you discover your next adventure.</p>
    <p>Spin the wheel and book your weekend getaway today!</p>
  `;
}

function generateBookingConfirmationEmail(data: { booking: any; offer: any }) {
  return `
    <h1>Booking Confirmed! ✈️</h1>
    <p>Your booking reference: <strong>${data.booking.bookingReference}</strong></p>
    <h2>Flight Details</h2>
    <p>
      ${data.offer.departureAirport.city} → ${data.offer.arrivalAirport.city}<br>
      Departure: ${new Date(data.offer.outboundDate).toLocaleDateString()}<br>
      Return: ${new Date(data.offer.returnDate).toLocaleDateString()}
    </p>
    <p>Total: ${data.booking.currency} ${(data.booking.totalPaid / 100).toFixed(2)}</p>
  `;
}

function generatePriceAlertEmail(data: any) {
  return `<h1>Price Alert!</h1>`;
}

export async function sendBookingConfirmation(params: {
  to: string;
  booking: any;
  offer: any;
}) {
  return sendEmail({
    to: params.to,
    subject: 'Booking Confirmed - TravelTomorrow',
    template: 'booking_confirmation',
    data: params,
  });
}
```

---

## 8. Testing

**packages/api/__tests__/wheel.test.ts:**
```typescript
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/database';

describe('Wheel Spin', () => {
  beforeAll(async () => {
    // Seed test data
    await prisma.airport.create({
      data: {
        iataCode: 'BRU',
        name: 'Brussels Airport',
        city: 'Brussels',
        country: 'Belgium',
        countryCode: 'BE',
        latitude: 50.9,
        longitude: 4.48,
        timezone: 'Europe/Brussels',
        isPopular: true,
      },
    });

    await prisma.destination.create({
      data: {
        city: 'Barcelona',
        country: 'Spain',
        countryCode: 'ES',
        airportId: 'BCN',
        slug: 'barcelona',
        title: 'Barcelona',
        isPublished: true,
      },
    });
  });

  it('should return offers for a wheel spin', async () => {
    const destination = await prisma.destination.findFirst();

    const response = await request(app)
      .post('/api/wheel/spin')
      .send({
        destinationId: destination!.id,
        userLocation: { latitude: 50.85, longitude: 4.35 },
      });

    expect(response.status).toBe(200);
    expect(response.body.destination).toBeDefined();
    expect(response.body.offers).toBeInstanceOf(Array);
  });
});
```

---

## Deliverables

- [ ] Wheel UI component with animations
- [ ] Duffel API integration for flight search
- [ ] Offer caching system
- [ ] Wheel spin API endpoint
- [ ] Booking creation flow
- [ ] Stripe payment integration
- [ ] Checkout form component
- [ ] Email confirmation system
- [ ] Unit tests for booking flow (>80% coverage)

## Success Criteria

1. ✅ User can spin wheel and see destination
2. ✅ Offers load from Duffel API
3. ✅ Offers are cached for 15 minutes
4. ✅ User can complete checkout
5. ✅ Payment processes via Stripe
6. ✅ Confirmation email sent
7. ✅ All tests pass

## Timeline

**Estimated Duration:** 2-3 weeks

---

**Next Stage:** [03-seo-editorial.md](./03-seo-editorial.md)
