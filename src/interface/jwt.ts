/**
 * Mendefinisikan bentuk payload yang kita simpan di dalam JWT.
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  name: string;
  iat?: number;
  exp?: number;
}
