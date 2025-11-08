import { logger } from '@traveltomorrow/shared';
import { checkActiveAlerts } from './alerts.service';
import { cleanupOldPriceHistory } from './priceHistory.service';

/**
 * Background job scheduler for price monitoring and alerts
 */
class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Start all scheduled jobs
   */
  start(): void {
    logger.info('Starting scheduler service...');

    // Check price alerts every 2 hours
    this.scheduleJob('price-alerts', 2 * 60 * 60 * 1000, async () => {
      logger.info('Running scheduled price alerts check');
      try {
        const triggeredCount = await checkActiveAlerts();
        logger.info(`Price alerts check completed: ${triggeredCount} alerts triggered`);
      } catch (error) {
        logger.error('Error in scheduled price alerts check:', error);
      }
    });

    // Clean up old price history once a day (at 2 AM)
    this.scheduleDailyJob('cleanup-price-history', 2, 0, async () => {
      logger.info('Running scheduled price history cleanup');
      try {
        const deletedCount = await cleanupOldPriceHistory();
        logger.info(`Price history cleanup completed: ${deletedCount} entries deleted`);
      } catch (error) {
        logger.error('Error in scheduled price history cleanup:', error);
      }
    });

    logger.info('Scheduler service started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    logger.info('Stopping scheduler service...');
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
    logger.info('Scheduler service stopped');
  }

  /**
   * Schedule a job to run at fixed intervals
   */
  private scheduleJob(name: string, intervalMs: number, job: () => Promise<void>): void {
    // Run immediately on start
    job().catch((error) => {
      logger.error(`Error in initial run of job ${name}:`, error);
    });

    // Then schedule recurring runs
    const interval = setInterval(() => {
      job().catch((error) => {
        logger.error(`Error in scheduled job ${name}:`, error);
      });
    }, intervalMs);

    this.intervals.push(interval);
    logger.info(`Scheduled job "${name}" to run every ${intervalMs / 1000 / 60} minutes`);
  }

  /**
   * Schedule a job to run daily at a specific time
   */
  private scheduleDailyJob(
    name: string,
    hour: number,
    minute: number,
    job: () => Promise<void>
  ): void {
    const scheduleNextRun = () => {
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hour, minute, 0, 0);

      // If scheduled time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const timeUntilRun = scheduledTime.getTime() - now.getTime();

      logger.info(
        `Scheduled daily job "${name}" to run at ${hour}:${minute.toString().padStart(2, '0')} (in ${Math.round(timeUntilRun / 1000 / 60)} minutes)`
      );

      const timeout = setTimeout(() => {
        job()
          .catch((error) => {
            logger.error(`Error in daily job ${name}:`, error);
          })
          .finally(() => {
            scheduleNextRun(); // Schedule next day's run
          });
      }, timeUntilRun);

      this.intervals.push(timeout as any);
    };

    scheduleNextRun();
  }

  /**
   * Manually trigger price alerts check (for testing/admin)
   */
  async triggerPriceAlertsCheck(): Promise<number> {
    logger.info('Manually triggering price alerts check');
    return await checkActiveAlerts();
  }

  /**
   * Manually trigger price history cleanup (for testing/admin)
   */
  async triggerPriceHistoryCleanup(): Promise<number> {
    logger.info('Manually triggering price history cleanup');
    return await cleanupOldPriceHistory();
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
