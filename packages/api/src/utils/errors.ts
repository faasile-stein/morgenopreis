/**
 * Custom error classes and error handling utilities
 */

import { logger } from '@traveltomorrow/shared';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: any) {
    super(message, 400, true, 'BAD_REQUEST', details);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(message, 401, true, 'UNAUTHORIZED', details);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(message, 403, true, 'FORBIDDEN', details);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, true, 'NOT_FOUND', details);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, true, 'CONFLICT', details);
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 422, true, 'VALIDATION_ERROR', details);
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, true, 'INTERNAL_ERROR', details);
  }
}

/**
 * 502 Bad Gateway (External API Error)
 */
export class ExternalAPIError extends AppError {
  constructor(message: string = 'External API error', details?: any) {
    super(message, 502, true, 'EXTERNAL_API_ERROR', details);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, 503, true, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Async handler wrapper for Express routes
 * Catches async errors and passes them to error middleware
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Retry utility for external API calls
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
  } = options;

  let lastError: Error | null = null;
  let currentDelay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      const isRetryable =
        attempt < maxRetries &&
        (retryableErrors.includes(error.code) ||
          error.statusCode >= 500 ||
          error.name === 'TimeoutError');

      if (!isRetryable) {
        throw error;
      }

      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after error:`, {
        error: error.message,
        delay: currentDelay,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      // Exponential backoff
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Circuit breaker for external services
 */
export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly monitoringPeriod: number = 120000 // 2 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new ServiceUnavailableError('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit breaker closed');
    }
  }

  private onFailure() {
    this.failureCount++;

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('Circuit breaker opened', {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt),
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

/**
 * Create circuit breaker instances for external services
 */
export const circuitBreakers = {
  duffel: new CircuitBreaker(5, 60000),
  supabase: new CircuitBreaker(10, 30000),
  booking: new CircuitBreaker(3, 120000),
};

/**
 * Handle errors in a standardized way
 */
export function handleError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Supabase errors
  if (error.code === 'PGRST') {
    return new BadRequestError('Database query error', { original: error.message });
  }

  // Duffel API errors
  if (error.meta?.status) {
    return new ExternalAPIError(`Duffel API error: ${error.message}`, {
      status: error.meta.status,
      errors: error.errors,
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message, error.details);
  }

  // Default to internal server error
  return new InternalServerError(error.message || 'An unexpected error occurred');
}

/**
 * Log error with appropriate level
 */
export function logError(error: Error | AppError) {
  if (error instanceof AppError && error.isOperational) {
    logger.warn('Operational error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });
  } else {
    logger.error('Unexpected error:', {
      message: error.message,
      stack: error.stack,
    });
  }
}
