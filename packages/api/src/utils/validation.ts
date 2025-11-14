/**
 * Input validation and sanitization utilities
 */

import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove HTML tags and escape special characters
  return validator.escape(validator.stripLow(input.trim()));
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  if (!validator.isEmail(email)) {
    return null;
  }
  return validator.normalizeEmail(email) || null;
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  return validator.isUUID(uuid);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  return validator.isDate(date, { format: 'YYYY-MM-DD', strictMode: true });
}

/**
 * Validate and sanitize integer with min/max bounds
 */
export function sanitizeInteger(
  value: any,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page: any, limit: any): { page: number; limit: number } {
  const validatedPage = sanitizeInteger(page, 1, 1000) || 1;
  const validatedLimit = sanitizeInteger(limit, 1, 100) || 20; // Max 100 items per page

  return { page: validatedPage, limit: validatedLimit };
}

/**
 * Validate airport IATA code (3 letters)
 */
export function isValidIATACode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

/**
 * Validate latitude/longitude
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Middleware: Validate required fields in request body
 */
export function validateRequiredFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = fields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        fields: missingFields,
      });
    }

    next();
  };
}

/**
 * Middleware: Sanitize request body strings
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
}

/**
 * Validate price value (in cents, must be positive)
 */
export function isValidPrice(price: number): boolean {
  return Number.isInteger(price) && price > 0;
}

/**
 * Validate currency code (ISO 4217)
 */
export function isValidCurrency(currency: string): boolean {
  const validCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK'];
  return validCurrencies.includes(currency.toUpperCase());
}

/**
 * Validate booking reference format
 */
export function isValidBookingReference(ref: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(ref);
}

/**
 * Sanitize search query string
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove special SQL/NoSQL injection characters
  return query
    .replace(/[';"\-\-\/\*]/g, '')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Validate destination slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Rate limit validation helper
 */
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export const RATE_LIMITS = {
  // Standard API calls
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later.',
  },
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  },
  // Expensive operations (searches, wheel spins)
  expensive: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Request limit exceeded, please slow down.',
  },
  // Admin operations
  admin: {
    windowMs: 60 * 1000,
    max: 30, // 30 requests per minute
    message: 'Admin rate limit exceeded.',
  },
};
