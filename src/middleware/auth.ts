import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin'; // Extensionless import to support Angular compiler config

export interface AuthRequest extends Request {
  user?: Record<string, unknown>; // To store decoded Firebase user token info
}

/**
 * Firebase Authentication Middleware
 * Secures routes by verifying the Bearer ID Token sent in the Authorization header.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or malformed authentication token.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken as unknown as Record<string, unknown>;
    next();
    return;
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token.' });
    return;
  }
};
