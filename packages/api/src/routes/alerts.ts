import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  createAlert,
  getUserAlerts,
  deleteAlert,
  updateAlertStatus,
  getUserAlertStats,
} from '../services/alerts.service';
import { getPriceStatistics, getPriceTrend } from '../services/priceHistory.service';
import { authenticate, AuthRequest } from '../middleware/supabaseAuth';
import { logger } from '@traveltomorrow/shared';

const router = Router();

/**
 * POST /api/alerts
 * Create a new price alert
 */
router.post(
  '/',
  authenticate,
  [
    body('origin').isString().isLength({ min: 3, max: 3 }).withMessage('Origin must be 3-letter IATA code'),
    body('destination').isString().isLength({ min: 3, max: 3 }).withMessage('Destination must be 3-letter IATA code'),
    body('alertType').isIn(['price_threshold', 'price_drop', 'good_deal']),
    body('maxPrice').optional().isFloat({ min: 0 }),
    body('priceDropPercent').optional().isInt({ min: 1, max: 100 }),
    body('departureDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { origin, destination, alertType, maxPrice, priceDropPercent, departureDate } = req.body;

      logger.info('Creating price alert', { userId, origin, destination, alertType });

      const alert = await createAlert({
        userId,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        alertType,
        maxPrice,
        priceDropPercent,
        departureDate,
      });

      if (!alert) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create alert',
        });
      }

      res.status(201).json({
        success: true,
        data: alert,
      });
    } catch (error: any) {
      logger.error('Error creating alert:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create alert',
      });
    }
  }
);

/**
 * GET /api/alerts
 * Get user's price alerts
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { active } = req.query;

    const alerts = await getUserAlerts(userId, active === 'true');

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error: any) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get alerts',
    });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics for current user
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await getUserAlertStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting alert stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get alert stats',
    });
  }
});

/**
 * PATCH /api/alerts/:id
 * Update alert status (activate/deactivate)
 */
router.patch(
  '/:id',
  authenticate,
  [body('isActive').isBoolean()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { id } = req.params;
      const { isActive } = req.body;

      const success = await updateAlertStatus(id, userId, isActive);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found or update failed',
        });
      }

      res.json({
        success: true,
        message: `Alert ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      logger.error('Error updating alert:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update alert',
      });
    }
  }
);

/**
 * DELETE /api/alerts/:id
 * Delete a price alert
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const success = await deleteAlert(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or deletion failed',
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete alert',
    });
  }
});

/**
 * GET /api/alerts/price-stats/:routeKey
 * Get price statistics for a route
 */
router.get('/price-stats/:routeKey', async (req: any, res: Response) => {
  try {
    const { routeKey } = req.params;
    const { currentPrice } = req.query;

    const stats = await getPriceStatistics(
      routeKey,
      currentPrice ? parseFloat(currentPrice as string) : undefined
    );

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No price statistics available for this route',
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting price stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get price statistics',
    });
  }
});

/**
 * GET /api/alerts/price-trend/:routeKey
 * Get price trend for a route
 */
router.get('/price-trend/:routeKey', async (req: any, res: Response) => {
  try {
    const { routeKey } = req.params;
    const { days = 30 } = req.query;

    const trend = await getPriceTrend(routeKey, parseInt(days as string));

    res.json({
      success: true,
      data: trend,
    });
  } catch (error: any) {
    logger.error('Error getting price trend:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get price trend',
    });
  }
});

export default router;
