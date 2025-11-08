import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { authRateLimiter } from '../middleware/rateLimit';
import { logger } from '@traveltomorrow/shared';

const router = Router();

/**
 * Register a new user
 * Supabase Auth handles password hashing, email verification, etc.
 */
router.post(
  '/register',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    try {
      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        logger.error('Registration error', { error: error.message });
        return res.status(400).json({ error: error.message });
      }

      if (!data.user) {
        return res.status(500).json({ error: 'User creation failed' });
      }

      // Update user profile in public.users (auto-created by trigger)
      if (firstName || lastName) {
        await supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
          })
          .eq('id', data.user.id);
      }

      res.status(201).json({
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName,
          lastName,
        },
        session: data.session,
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * Login with email and password
 */
router.post(
  '/login',
  authRateLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.warn('Login failed', { email, error: error.message });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!data.user || !data.session) {
        return res.status(401).json({ error: 'Login failed' });
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('first_name, last_name, role, status')
        .eq('id', data.user.id)
        .single();

      if (profile?.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Account suspended' });
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      res.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          role: profile?.role,
        },
        session: data.session,
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * Logout (revoke refresh token)
 */
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      await supabase.auth.admin.signOut(token);
    } catch (error) {
      // Ignore errors on logout
    }
  }

  res.json({ message: 'Logged out successfully' });
});

/**
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({ session: data.session });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
