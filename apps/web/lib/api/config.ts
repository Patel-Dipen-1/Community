/**
 * Centralized API Global Environment Configuration
 * 
 * Provides robust base URL normalization ensuring /api/v1 prefix is automatically present.
 */

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl.endsWith('/api/v1')) return envUrl;
    return `${envUrl.replace(/\/$/, '')}/api/v1`;
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    if (!port || port === '80' || port === '443') {
      return `${protocol}//${hostname}/api/v1`;
    }
    return `${protocol}//${hostname}:5000/api/v1`;
  }

  return 'http://localhost:5000/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 15000,
};
