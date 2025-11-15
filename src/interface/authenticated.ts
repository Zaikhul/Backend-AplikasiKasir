import { Request } from 'express';

/**
 * Mendefinisikan bentuk object `user` yang akan
 * dilampirkan ke `req` setelah divalidasi oleh JwtAuthGuard.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  name: string;
}

/**
 * Tipe kustom untuk object Request yang membawa data user.
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
