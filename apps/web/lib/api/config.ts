/**
 * Centralized API Global Environment Configuration
 * 
 * Provides robust base URL normalization ensuring /api/v1 prefix is automatically present.
 */

const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  if (envUrl.endsWith('/api/v1')) return envUrl;
  return `${envUrl.replace(/\/$/, '')}/api/v1`;
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 15000,
};
