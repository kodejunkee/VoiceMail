/**
 * Auth Middleware
 *
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches the user's ID and email to the request object.
 */

import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { AuthenticatedRequest } from '../types';

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify the JWT and get the user
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user info to request
    req.user = {
      id: data.user.id,
      email: data.user.email || '',
    };

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
