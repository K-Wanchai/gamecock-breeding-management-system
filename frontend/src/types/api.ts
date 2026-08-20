/** Shape of DRF's PageNumberPagination envelope (config/settings.py REST_FRAMEWORK). */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** apps.reports.views.BaseReportView merges a `summary` (computed over the filtered-but-unpaginated queryset) into the standard envelope. */
export interface PaginatedReportResponse<T, S> extends PaginatedResponse<T> {
  summary: S
}
