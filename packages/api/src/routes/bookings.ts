import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { duffel } from '../config/duffel';
import { supabase } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/supabaseAuth';
import { logger } from '@traveltomorrow/shared';

const router = Router();

/**
 * POST /api/bookings
 * Create a booking from a Duffel offer
 *
 * Body:
 * - offerId: string - Duffel offer ID
 * - passengers: array - Passenger details
 * - payment: object - Payment information (or payment_intent_id)
 */
router.post(
  '/',
  authenticate,
  [
    body('offerId').isString().notEmpty(),
    body('passengers').isArray({ min: 1 }),
    body('passengers.*.given_name').isString().notEmpty(),
    body('passengers.*.family_name').isString().notEmpty(),
    body('passengers.*.born_on').isString().matches(/^\d{4}-\d{2}-\d{2}$/),
    body('passengers.*.email').optional().isEmail(),
    body('passengers.*.phone_number').optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { offerId, passengers } = req.body;
      const userId = req.user!.id;

      logger.info('Creating booking', { userId, offerId, passengerCount: passengers.length });

      // 1. Create Duffel order
      const order = await duffel.orders.create({
        selected_offers: [offerId],
        passengers: passengers.map((p: any) => ({
          type: 'adult', // TODO: Support child/infant
          title: p.title || 'mr',
          given_name: p.given_name,
          family_name: p.family_name,
          born_on: p.born_on,
          email: p.email,
          phone_number: p.phone_number || undefined,
          gender: p.gender || 'm',
        })),
        payments: [
          {
            type: 'balance',
            amount: '0.00', // For now, assume balance payment
            currency: 'GBP',
          },
        ],
        type: 'instant', // Instant ticketing
      });

      logger.info(`Duffel order created: ${order.data.id}`);

      // 2. Store booking in database
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          duffel_order_id: order.data.id,
          offer_id: offerId,
          status: 'confirmed',
          total_amount: order.data.total_amount,
          total_currency: order.data.total_currency,
          passenger_count: passengers.length,
          passenger_data: passengers,
          booking_reference: order.data.booking_reference,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error storing booking:', error);
        throw new Error('Failed to store booking in database');
      }

      // 3. Award loyalty points
      const pointsEarned = Math.floor(parseFloat(order.data.total_amount) / 10);
      await supabase.rpc('increment_loyalty_points', {
        user_id: userId,
        points: pointsEarned,
      });

      res.status(201).json({
        success: true,
        data: {
          booking,
          order: order.data,
          points_earned: pointsEarned,
        },
      });
    } catch (error: any) {
      logger.error('Booking creation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create booking',
      });
    }
  }
);

/**
 * GET /api/bookings
 * Get current user's bookings
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: bookings,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: bookings.length,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bookings',
    });
  }
});

/**
 * GET /api/bookings/:id
 * Get specific booking details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Optionally fetch fresh data from Duffel
    try {
      const duffelOrder = await duffel.orders.get(booking.duffel_order_id);
      booking.duffel_order = duffelOrder.data;
    } catch (duffelError) {
      logger.warn('Could not fetch Duffel order:', duffelError);
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error: any) {
    logger.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch booking',
    });
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already cancelled',
      });
    }

    // Cancel with Duffel (if supported)
    // Note: Duffel cancellation depends on fare rules
    try {
      const cancelRequest = await duffel.orderCancellations.create({
        order_id: booking.duffel_order_id,
      });

      logger.info(`Duffel cancellation requested: ${cancelRequest.data.id}`);

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: cancelRequest.data,
      });
    } catch (duffelError: any) {
      logger.error('Duffel cancellation error:', duffelError);
      res.status(400).json({
        success: false,
        error: duffelError.message || 'Cancellation not available for this booking',
      });
    }
  } catch (error: any) {
    logger.error('Booking cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel booking',
    });
  }
});

export default router;
