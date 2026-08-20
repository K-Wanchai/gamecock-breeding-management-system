import { api } from '@/lib/api/client'
import type { Document, DocumentGeneratePayload, DocumentListParams } from '@/types/document'
import type { PaginatedResponse } from '@/types/api'

export async function listDocuments(
  params: DocumentListParams,
): Promise<PaginatedResponse<Document>> {
  const { data } = await api.get<PaginatedResponse<Document>>('/documents/', { params })
  return data
}

export async function generateDocument(payload: DocumentGeneratePayload): Promise<Document> {
  const { data } = await api.post<Document>('/documents/', payload)
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

/**
 * Same authenticated fetch as downloadDocument, but hands back the blob URL to open
 * in a new tab instead of forcing a save — the caller is responsible for revoking it
 * once the tab has had a chance to load (a short delay, since revoking immediately
 * can race the new tab's fetch of the blob: URL).
 */
export async function previewDocumentUrl(id: number): Promise<string> {
  const response = await api.get(`/documents/${id}/download/`, { responseType: 'blob' })
  return URL.createObjectURL(response.data as Blob)
}
