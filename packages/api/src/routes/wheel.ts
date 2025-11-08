import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { spinWheel } from '../services/wheel.service';
import { getCachedOffer } from '../services/offers.service';
import { optionalAuth } from '../middleware/supabaseAuth';
import { logger } from '@traveltomorrow/shared';

const router = Router();

/**
 * POST /api/wheel/spin
 * Execute a wheel spin to get destination offers
 *
 * Body:
 * - lat?: number - User latitude
 * - lng?: number - User longitude
 * - homeAirportIata?: string - User's preferred home airport
 * - preferences?: object - User preferences (budget, trip_type, etc.)
 */
router.post(
  '/spin',
  optionalAuth, // Allow both authenticated and anonymous users
  [
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
    body('homeAirportIata').optional().isString().isLength({ min: 3, max: 3 }),
    body('preferences').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { lat, lng, homeAirportIata, preferences } = req.body;
      const userId = (req as any).user?.id;

      logger.info('Wheel spin requested', {
        userId,
        lat,
        lng,
        homeAirportIata,
      });

      const result = await spinWheel({
        userId,
        userLat: lat,
        userLng: lng,
        homeAirportIata,
        preferences,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Wheel spin error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute wheel spin',
      });
    }
  }
);

/**
 * GET /api/wheel/offers/:offerId
 * Get details of a specific offer by Duffel offer ID
 */
router.get('/offers/:offerId', async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;

    const offer = await getCachedOffer(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found or expired',
      });
    }

    res.json({
      success: true,
      data: offer,
    });
  } catch (error: any) {
    logger.error('Error fetching offer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch offer',
    });
  }
});

export default router;
