import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthRequest } from '../middleware/supabaseAuth';
import { getFunnelMetrics } from '../services/analytics.service';
import { schedulerService } from '../services/scheduler.service';
import { logger } from '@traveltomorrow/shared';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/admin/stats
 * Get overall platform statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { data: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const { data: bookingCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true });

    const { data: alertCount } = await supabase
      .from('price_alerts')
      .select('id', { count: 'exact', head: true });

    const { data: wheelSpinCount } = await supabase
      .from('wheel_spins')
      .select('id', { count: 'exact', head: true });

    // Get revenue (sum of booking amounts)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('status', 'confirmed');

    const totalRevenue = bookings?.reduce((sum, b) => sum + parseFloat(b.total_amount), 0) || 0;

    res.json({
      success: true,
      data: {
        total_users: userCount?.length || 0,
        total_bookings: bookingCount?.length || 0,
        total_alerts: alertCount?.length || 0,
        total_wheel_spins: wheelSpinCount?.length || 0,
        total_revenue: totalRevenue,
      },
    });
  } catch (error: any) {
    logger.error('Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics',
    });
  }
});

/**
 * GET /api/admin/funnel
 * Get conversion funnel metrics
 */
router.get('/funnel', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await getFunnelMetrics(start, end);

    res.json({
      success: true,
      data: metrics,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Error getting funnel metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get funnel metrics',
    });
  }
});

/**
 * POST /api/admin/destinations
 * Create or update a destination
 */
router.post(
  '/destinations',
  [
    body('name').isString().notEmpty(),
    body('city').isString().notEmpty(),
    body('country').isString().notEmpty(),
    body('primaryAirportIata').isString().isLength({ min: 3, max: 3 }),
    body('description').optional().isString(),
    body('isFeatured').optional().isBoolean(),
    body('isPublished').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        id,
        name,
        city,
        country,
        primaryAirportIata,
        description,
        isFeatured,
        isPublished,
        estimatedPriceEur,
        heroImage,
        tags,
      } = req.body;

      const destinationData = {
        name,
        city,
        country,
        primary_airport_iata: primaryAirportIata,
        description: description || null,
        is_featured: isFeatured !== undefined ? isFeatured : false,
        is_published: isPublished !== undefined ? isPublished : true,
        estimated_price_eur: estimatedPriceEur || null,
        hero_image: heroImage || null,
        tags: tags || [],
      };

      let result;

      if (id) {
        // Update existing destination
        const { data, error } = await supabase
          .from('destinations')
          .update(destinationData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new destination
        const { data, error } = await supabase
          .from('destinations')
          .insert(destinationData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      res.status(id ? 200 : 201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error managing destination:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to manage destination',
      });
    }
  }
);

/**
 * GET /api/admin/destinations
 * Get all destinations (including unpublished)
 */
router.get('/destinations', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    logger.error('Error getting destinations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get destinations',
    });
  }
});

/**
 * POST /api/admin/scheduler/trigger-alerts
 * Manually trigger price alerts check
 */
router.post('/scheduler/trigger-alerts', async (req: AuthRequest, res: Response) => {
  try {
    const triggeredCount = await schedulerService.triggerPriceAlertsCheck();

    res.json({
      success: true,
      message: `Price alerts check triggered: ${triggeredCount} alerts fired`,
    });
  } catch (error: any) {
    logger.error('Error triggering alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger alerts',
    });
  }
});

/**
 * POST /api/admin/scheduler/trigger-cleanup
 * Manually trigger price history cleanup
 */
router.post('/scheduler/trigger-cleanup', async (req: AuthRequest, res: Response) => {
  try {
    const deletedCount = await schedulerService.triggerPriceHistoryCleanup();

    res.json({
      success: true,
      message: `Price history cleanup completed: ${deletedCount} entries deleted`,
    });
  } catch (error: any) {
    logger.error('Error triggering cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger cleanup',
    });
  }
});

export default router;
