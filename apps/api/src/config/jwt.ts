import crypto from 'crypto';

/**
 * Resolves the JWT secret key securely from the environment.
 * Throws in production if an insecure default or missing secret is detected.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProd) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is required in production!');
    }
    // Return a stable dev fallback in local non-production environment
    return 'tc-dev-jwt-secret-key-local-only-do-not-use-in-production-2026';
  }

  if (isProd && (secret === 'b2b-secure-jwt-secret-key-2026' || secret.length < 32)) {
    throw new Error('FATAL SECURITY ERROR: Insecure or weak JWT_SECRET is prohibited in production!');
  }

  return secret;
};

export const JWT_SECRET = getJwtSecret();
