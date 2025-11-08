import { PrismaClient } from '@traveltomorrow/database/src/generated/client';
import { logger } from '@traveltomorrow/shared';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle disconnection
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
});

export default prisma;
