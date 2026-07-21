/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Replaces the old inline session middleware in server.ts. The previous
 * version called loadDB() — a synchronous full-file read+parse of the
 * entire application's data — on every single request before any route
 * ran, whether or not that route even needed the database. This version
 * makes exactly one indexed query (sessions.token_hash) and, only on a
 * cache miss path, one more (users.id), both async and non-blocking.
 *
 * requireAuth / requireVerifiedEmail / requirePermission / requireRole /
 * requireAdmin are carried over unchanged from server.ts — they only read
 * req.user / req.permissions set by sessionMiddleware below, so they had
 * no database coupling to begin with and don't need to change.
 */

import type { Request, Response, NextFunction } from 'express';
import { sessionsRepo, usersRepo, auditRepo } from '../db/index.ts';
import { parseCookies } from '../auth';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  created_at: Date;
  onboarding_completed: boolean;
  usage_count_month: number;
  billing_customer_id: string | null;
  billing_status: string | null;
  email_verified: boolean;
  status: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | null;
      sessionToken?: string;
      permissions?: string[];
    }
  }
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies['session_id'];

    if (!sessionToken) {
      req.user = null;
      return next();
    }

    const session = await sessionsRepo.lookupSession(sessionToken);
    if (!session) {
      req.user = null;
      return next();
    }

    const user = await usersRepo.findUserById(session.user_id);
    if (!user) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      created_at: user.created_at,
      onboarding_completed: user.onboarding_completed,
      usage_count_month: user.usage_count_month,
      billing_customer_id: user.billing_customer_id,
      billing_status: user.billing_status,
      email_verified: user.email_verified,
      status: user.status,
    };
    req.sessionToken = sessionToken;
    req.permissions = await usersRepo.getRolePermissions(user.role);
    next();
  } catch (err) {
    // A database hiccup on session resolution must not crash the process —
    // fail closed (treat as unauthenticated) and let the route's own
    // requireAuth reject it, rather than letting the error propagate
    // unhandled out of middleware.
    console.error('[AUTH] Session resolution failed', err);
    req.user = null;
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
  }
  next();
}

export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
  }
  if (req.user.email_verified === false) {
    return res.status(403).json({ error: 'Email verification required.', email_verification_required: true });
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }
    const userPermissions = req.permissions || [];
    if (!userPermissions.includes('system:all') && !userPermissions.includes(permission)) {
      void auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.forbidden_permission_attempt', `User tried to access route ${req.path} without permission: ${permission}`);
      return res.status(403).json({ error: `Access denied. Missing permission: ${permission}` });
    }
    next();
  };
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }
    if (req.user.role !== role && req.user.role !== 'super_admin') {
      void auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.forbidden_role_attempt', `User tried to access route ${req.path} requiring role: ${role}`);
      return res.status(403).json({ error: `Access denied. Required role: ${role}` });
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
  }
  const userPermissions = req.permissions || [];
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && !userPermissions.includes('users:manage')) {
    void auditRepo.logSecurityEvent(req.user.id, req.ip, 'auth.unauthorized_admin_attempt', `User tried to access admin route: ${req.path}`);
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}
