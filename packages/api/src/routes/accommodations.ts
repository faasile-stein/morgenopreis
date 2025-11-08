import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { generateBookingComLink, trackAffiliateClick } from '../services/affiliates.service';
import { optionalAuth } from '../middleware/supabaseAuth';
import { logger } from '@traveltomorrow/shared';

const router = Router();

/**
 * GET /api/accommodations/search-link
 * Generate affiliate link for accommodation search
 */
router.get(
  '/search-link',
  optionalAuth,
  [
    query('city').isString().notEmpty(),
    query('checkIn').matches(/^\d{4}-\d{2}-\d{2}$/),
    query('checkOut').matches(/^\d{4}-\d{2}-\d{2}$/),
    query('adults').optional().isInt({ min: 1, max: 30 }),
    query('children').optional().isInt({ min: 0, max: 10 }),
    query('rooms').optional().isInt({ min: 1, max: 10 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { city, checkIn, checkOut, adults, children, rooms, destinationId } = req.query;
      const userId = (req as any).user?.id || null;

      const affiliateLink = generateBookingComLink({
        destinationCity: city as string,
        checkIn: checkIn as string,
        checkOut: checkOut as string,
        adults: adults ? parseInt(adults as string) : 2,
        children: children ? parseInt(children as string) : 0,
        rooms: rooms ? parseInt(rooms as string) : 1,
      });

      // Track click for analytics
      await trackAffiliateClick(userId, 'booking.com', destinationId as string || null, {
        city,
        checkIn,
        checkOut,
      });

      res.json({
        success: true,
        data: affiliateLink,
      });
    } catch (error: any) {
      logger.error('Error generating accommodation link:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate accommodation link',
      });
    }
  }
);

export default router;
