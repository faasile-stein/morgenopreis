import { Router } from 'express';
import { supabase } from '../config/supabase';
import { redisClient } from '../config/redis';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'traveltomorrow-api',
  });
});

/**
 * GET /health/detailed
 * Detailed health check with dependency status
 */
router.get('/detailed', async (req, res) => {
  const checks = {
    supabase: false,
    redis: false,
  };

  // Check Supabase connection
  try {
    const { error } = await supabase
      .from('airports')
      .select('iata_code')
      .limit(1);

    checks.supabase = !error;
  } catch (err) {
    // Supabase check failed
  }

  // Check Redis connection
  try {
    if (redisClient.isOpen) {
      await redisClient.ping();
      checks.redis = true;
    }
  } catch (err) {
    // Redis check failed
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    service: 'traveltomorrow-api',
  });
});

export default router;
