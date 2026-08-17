import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { downloadDocument, listDocuments } from '@/lib/api/documents'
import type { DocumentListParams } from '@/types/document'

/**
 * No `enabled` gate here — unlike the other per-parent lookups in this app, an empty
 * params object is a valid, meaningful call: the backend's own ownership scoping
 * already restricts an unfiltered GET /documents/ to just the caller's own rows, which
 * is exactly what the standalone documents list page wants.
 */
export function useDocumentsQuery(params: DocumentListParams) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => listDocuments(params),
    placeholderData: keepPreviousData,
  })
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: number; filename: string }) =>
      downloadDocument(id, filename),
  })
}
