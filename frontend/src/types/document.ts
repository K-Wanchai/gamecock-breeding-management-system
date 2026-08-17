export type DocumentType = 'CONTRACT' | 'PEDIGREE_CERTIFICATE' | 'DELIVERY_DOCUMENT'

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  CONTRACT: 'ใบรับฝากผสม/สัญญา',
  PEDIGREE_CERTIFICATE: 'ใบรับรองสายพันธุ์',
  DELIVERY_DOCUMENT: 'เอกสารส่งมอบ',
}

interface DocumentBookingSummary {
  id: number
  booking_number: string
}

interface DocumentChickSummary {
  id: number
  wing_clip_number: string
  name: string | null
}

/**
 * No file URL is included here — the serializer deliberately omits file_path.
 * Download goes through GET /documents/{id}/download/ as an authenticated request
 * (see lib/api/documents.ts downloadDocument), not a plain link, since auth is a JWT
 * bearer header rather than a cookie a browser would send on a bare <a href>.
 */
export interface Document {
  id: number
  public_uuid: string
  document_type: DocumentType
  document_number: string
  booking: DocumentBookingSummary | null
  chick: DocumentChickSummary | null
  generated_at: string | null
  generated_by: { id: number; username: string } | null
  created_at: string
  updated_at: string
}

export interface DocumentListParams {
  page?: number
  booking?: number
  chick?: number
}
