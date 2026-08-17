/** Shape of DRF's PageNumberPagination envelope (config/settings.py REST_FRAMEWORK). */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
