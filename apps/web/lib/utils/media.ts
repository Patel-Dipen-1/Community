/**
 * Centralized Media URL Normalizer
 * Converts localhost / relative upload paths into valid active API URLs
 */
export function formatMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800';
  }

  const cleanUrl = url.trim();

  // If base64 data URI or blob URL, return as-is
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }

  // Active API Host configuration
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const apiBase = envApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

  // Handle uploaded static files
  if (cleanUrl.includes('/uploads/')) {
    const relativePath = cleanUrl.substring(cleanUrl.indexOf('/uploads/'));
    return `${apiBase}${relativePath}`;
  }

  if (cleanUrl.startsWith('uploads/')) {
    return `${apiBase}/${cleanUrl}`;
  }

  return cleanUrl;
}
