/**
 * Professional query parameter serialization utilities
 * Provides type-safe and elegant query string construction
 */

export interface QueryParams {
  [key: string]: string | number | boolean | string[] | number[] | boolean[] | undefined | null
}

export interface SerializeOptions {
  /** Skip undefined values (default: true) */
  skipUndefined?: boolean
  /** Skip null values (default: true) */
  skipNull?: boolean
  /** Skip empty arrays (default: true) */
  skipEmptyArrays?: boolean
  /** Prefix for array parameters (default: none) */
  arrayFormat?: 'repeat' | 'bracket' | 'comma'
}

/**
 * Serializes an object to URLSearchParams with proper type handling
 * @param params - Object containing query parameters
 * @param options - Serialization options
 * @returns URLSearchParams instance ready for use
 */
export function serializeQueryParams(
  params: QueryParams,
  options: SerializeOptions = {}
): URLSearchParams {
  const {
    skipUndefined = true,
    skipNull = true,
    skipEmptyArrays = true,
    arrayFormat = 'repeat'
  } = options

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    // Skip undefined values
    if (skipUndefined && value === undefined) continue

    // Skip null values
    if (skipNull && value === null) continue

    // Handle arrays
    if (Array.isArray(value)) {
      if (skipEmptyArrays && value.length === 0) continue

      switch (arrayFormat) {
        case 'bracket':
          value.forEach(item => searchParams.append(`${key}[]`, String(item)))
          break
        case 'comma':
          searchParams.append(key, value.map(String).join(','))
          break
        case 'repeat':
        default:
          value.forEach(item => searchParams.append(key, String(item)))
          break
      }
    } else {
      // Handle single values
      searchParams.append(key, String(value))
    }
  }

  return searchParams
}

/**
 * Serializes an object directly to a query string
 * @param params - Object containing query parameters
 * @param options - Serialization options
 * @returns Query string (without leading ?)
 */
export function createQueryString(
  params: QueryParams,
  options?: SerializeOptions
): string {
  return serializeQueryParams(params, options).toString()
}

/**
 * Merges base parameters with additional parameters
 * @param baseParams - Base query parameters
 * @param additionalParams - Additional parameters to merge
 * @param options - Serialization options
 * @returns URLSearchParams with merged parameters
 */
export function mergeQueryParams(
  baseParams: QueryParams,
  additionalParams: QueryParams,
  options?: SerializeOptions
): URLSearchParams {
  return serializeQueryParams({ ...baseParams, ...additionalParams }, options)
}

/**
 * Builds a complete URL with query parameters
 * @param baseUrl - Base URL without query string
 * @param params - Query parameters to append
 * @param options - Serialization options
 * @returns Complete URL with query string
 */
export function buildUrlWithParams(
  baseUrl: string,
  params: QueryParams,
  options?: SerializeOptions
): string {
  const queryString = createQueryString(params, options)
  const separator = baseUrl.includes('?') ? '&' : '?'
  return queryString ? `${baseUrl}${separator}${queryString}` : baseUrl
}

/**
 * Type-safe pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Type-safe filtering parameters
 */
export interface FilterParams {
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any
}

/**
 * Creates pagination query parameters
 * @param pagination - Pagination parameters
 * @returns Query parameters object
 */
export function createPaginationParams(pagination: PaginationParams): QueryParams {
  return {
    ...(pagination.page !== undefined && { page: pagination.page }),
    ...(pagination.limit !== undefined && { limit: pagination.limit }),
    ...(pagination.offset !== undefined && { offset: pagination.offset })
  }
}

/**
 * Creates filter query parameters with type safety
 * @param filters - Filter parameters
 * @returns Query parameters object
 */
export function createFilterParams(filters: FilterParams): QueryParams {
  const params: QueryParams = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value
    }
  }

  return params
}