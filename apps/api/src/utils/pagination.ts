import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  role?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortKey?: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Extracts, sanitizes, and normalizes standard pagination and filter query parameters from Express Request.
 */
export function parsePaginationParams(req: Request, defaultLimit = 100): PaginationParams {
  const pageRaw = parseInt(req.query.page as string, 10);
  const limitRaw = parseInt(req.query.limit as string, 10);

  const page = !isNaN(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  // Capped at max 200 items per request to prevent memory spikes, default is 100
  const limit = !isNaN(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : defaultLimit;
  const skip = (page - 1) * limit;

  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const role = req.query.role ? String(req.query.role).trim() : undefined;
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  const startDate = req.query.startDate ? String(req.query.startDate).trim() : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate).trim() : undefined;
  const sortKey = req.query.sortKey ? String(req.query.sortKey).trim() : undefined;
  const sortOrderRaw = req.query.sortOrder ? String(req.query.sortOrder).toLowerCase() : 'desc';
  const sortOrder: 'asc' | 'desc' = sortOrderRaw === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    skip,
    search,
    role,
    status,
    startDate,
    endDate,
    sortKey,
    sortOrder,
  };
}

/**
 * Builds standard pagination metadata object.
 */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
