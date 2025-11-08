import { Router } from 'express';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';

const router = Router();

router.get('/', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/detailed', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (err) {
    // log error
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.ping();
      checks.redis = true;
    }
  } catch (err) {
    // log error
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
