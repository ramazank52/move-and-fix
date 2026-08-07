/**
 * Pagination Utility Module
 * 
 * Provides standardized pagination for all list endpoints
 * Supports limit/offset and cursor-based pagination
 */

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    count: number;
    limit: number;
    offset: number;
    page: number;
    pages: number;
    hasMore: boolean;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Parse and validate pagination parameters
 */
export function parsePaginationParams(params: any): {
  limit: number;
  offset: number;
  page: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} {
  // Default values
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;
  const MIN_LIMIT = 1;

  // Parse limit
  let limit = parseInt(params.limit || params.pageSize || DEFAULT_LIMIT, 10);
  limit = Math.max(MIN_LIMIT, Math.min(limit, MAX_LIMIT));

  // Parse offset/page
  let offset = 0;
  let page = 1;

  if (params.offset !== undefined) {
    offset = Math.max(0, parseInt(params.offset, 10));
    page = Math.floor(offset / limit) + 1;
  } else if (params.page !== undefined) {
    page = Math.max(1, parseInt(params.page, 10));
    offset = (page - 1) * limit;
  }

  // Parse sorting
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = (params.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  return {
    limit,
    offset,
    page,
    sortBy,
    sortOrder
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): PaginatedResponse<T> {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  const count = data.length;
  const hasMore = offset + count < total;

  return {
    data,
    pagination: {
      total,
      count,
      limit,
      offset,
      page,
      pages,
      hasMore
    },
    sortBy,
    sortOrder
  };
}

/**
 * Build SQL LIMIT/OFFSET clause
 */
export function buildLimitOffsetClause(limit: number, offset: number): string {
  return `LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Build SQL ORDER BY clause
 */
export function buildOrderByClause(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  allowedFields: string[]
): string {
  // Validate sortBy to prevent SQL injection
  if (!allowedFields.includes(sortBy)) {
    sortBy = 'createdAt';
  }

  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortBy} ${direction}`;
}

/**
 * Express middleware to parse pagination params
 */
export function paginationMiddleware(req: any, res: any, next: any) {
  const pagination = parsePaginationParams(req.query);
  req.pagination = pagination;
  next();
}

/**
 * Cursor-based pagination utility
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor: {
    nextCursor?: string;
    previousCursor?: string;
    hasMore: boolean;
  };
}

/**
 * Encode cursor
 */
export function encodeCursor(id: string, timestamp: number): string {
  return Buffer.from(`${id}:${timestamp}`).toString('base64');
}

/**
 * Decode cursor
 */
export function decodeCursor(cursor: string): { id: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [id, timestamp] = decoded.split(':');
    return { id, timestamp: parseInt(timestamp, 10) };
  } catch {
    return null;
  }
}

/**
 * Build cursor-based pagination query
 */
export function buildCursorQuery(
  cursor?: string,
  limit: number = 20,
  direction: 'forward' | 'backward' = 'forward'
): {
  limit: number;
  operator: '>' | '<';
  cursor?: { id: string; timestamp: number };
} {
  const decodedCursor = cursor ? decodeCursor(cursor) : null;

  return {
    limit: Math.min(limit, 100),
    operator: direction === 'forward' ? '>' : '<',
    cursor: decodedCursor || undefined
  };
}

/**
 * Create cursor-paginated response
 */
export function createCursorPaginatedResponse<T extends { id: string; createdAt: Date }>(
  data: T[],
  limit: number,
  direction: 'forward' | 'backward' = 'forward'
): CursorPaginatedResponse<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  let nextCursor: string | undefined;
  let previousCursor: string | undefined;

  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    const firstItem = items[0];

    if (direction === 'forward' && hasMore) {
      nextCursor = encodeCursor(lastItem.id, lastItem.createdAt.getTime());
    }

    if (direction === 'backward' && hasMore) {
      previousCursor = encodeCursor(firstItem.id, firstItem.createdAt.getTime());
    }
  }

  return {
    data: items,
    cursor: {
      nextCursor,
      previousCursor,
      hasMore
    }
  };
}

/**
 * Validate pagination params
 */
export function validatePaginationParams(params: any): string[] {
  const errors: string[] = [];

  if (params.limit !== undefined) {
    const limit = parseInt(params.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('limit must be between 1 and 100');
    }
  }

  if (params.offset !== undefined) {
    const offset = parseInt(params.offset, 10);
    if (isNaN(offset) || offset < 0) {
      errors.push('offset must be >= 0');
    }
  }

  if (params.page !== undefined) {
    const page = parseInt(params.page, 10);
    if (isNaN(page) || page < 1) {
      errors.push('page must be >= 1');
    }
  }

  if (params.sortOrder !== undefined) {
    if (!['asc', 'desc'].includes(params.sortOrder.toLowerCase())) {
      errors.push('sortOrder must be "asc" or "desc"');
    }
  }

  return errors;
}
