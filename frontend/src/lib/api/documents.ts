import { api } from '@/lib/api/client'
import type { Document, DocumentListParams } from '@/types/document'
import type { PaginatedResponse } from '@/types/api'

export async function listDocuments(
  params: DocumentListParams,
): Promise<PaginatedResponse<Document>> {
  const { data } = await api.get<PaginatedResponse<Document>>('/documents/', { params })
  return data
}

/**
 * Streams the PDF through an authenticated request (api's interceptor attaches the
 * JWT) rather than a plain <a href> — the download endpoint needs the bearer token,
 * which a bare browser navigation wouldn't send. Triggers a normal save via a
 * throwaway anchor once the blob is in hand.
 */
export async function downloadDocument(id: number, filename: string): Promise<void> {
  const response = await api.get(`/documents/${id}/download/`, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}
