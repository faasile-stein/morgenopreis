import { Request, Response, NextFunction } from 'express';
import { logger } from '@traveltomorrow/shared';
import { AppError, handleError, logError } from '../utils/errors';

/**
 * Global error handler middleware
 * Handles all errors and sends appropriate responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Convert to AppError if not already
  const appError = err instanceof AppError ? err : handleError(err);

  // Log error
  logError(appError);

  // Additional context logging
  logger.error('Error context:', {
    path: req.path,
    method: req.method,
    user: (req as any).user?.id,
    ip: req.ip,
  });

  // Send error response
  res.status(appError.statusCode).json({
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      ...(appError.details && { details: appError.details }),
    },
    // Include stack trace in development mode
    ...(process.env.NODE_ENV === 'development' && {
      stack: appError.stack,
    }),
  });
}

/**
 * Handle 404 errors for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
      code: 'ROUTE_NOT_FOUND',
    },
  });
}
