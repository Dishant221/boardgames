import jwt from '@tsndr/cloudflare-worker-jwt';
import { AuthPayload } from '../types';

const JWT_EXPIRY_SECONDS = 60 * 60 * 24; // 24h
export const DEV_JWT_SECRET = 'dev-secret-key-change-in-production';

export async function generateToken(payload: AuthPayload, secret: string): Promise<string> {
  return jwt.sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS },
    secret
  );
}

export async function verifyToken(token: string, secret: string): Promise<AuthPayload | null> {
  try {
    const isValid = await jwt.verify(token, secret);
    if (!isValid) return null;

    const { payload } = jwt.decode(token);
    return payload as unknown as AuthPayload;
  } catch (_error) {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
