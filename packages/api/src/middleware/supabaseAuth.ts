import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '@traveltomorrow/shared';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to authenticate requests using Supabase Auth
 * Verifies the JWT token and attaches user info to request
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication failed', { error: error?.message });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile from public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile', { error: profileError });
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (profile.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email!,
      role: profile.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token, continue without user
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (profile && profile.status === 'ACTIVE') {
        req.user = {
          id: user.id,
          email: user.email!,
          role: profile.role,
        };
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
}
