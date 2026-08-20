import { Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentsQuery, useDownloadDocument, usePreviewDocument } from '@/hooks/use-documents'
import { toastApiError } from '@/lib/toast'
import { DOCUMENT_TYPE_LABEL } from '@/types/document'
import type { Document, DocumentListParams } from '@/types/document'

export function DocumentList({ params }: { params: DocumentListParams }) {
  const { data } = useDocumentsQuery(params)
  const download = useDownloadDocument()
  const preview = usePreviewDocument()

  function handleDownload(document: Document) {
    download.mutate(
      { id: document.id, filename: `${document.document_number}.pdf` },
      { onError: toastApiError },
    )
  }

  function handlePreview(document: Document) {
    preview.mutate(document.id, {
      onSuccess: (blobUrl) => {
        window.open(blobUrl, '_blank')
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      },
      onError: toastApiError,
    })
  }

  if (!data || data.results.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีเอกสาร</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {data.results.map((document) => (
        <div
          key={document.id}
          className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
        >
          <div>
            <p className="font-medium">{DOCUMENT_TYPE_LABEL[document.document_type]}</p>
            <p className="text-muted-foreground">{document.document_number}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview(document)}
              disabled={preview.isPending}
            >
              <Eye className="size-4" />
              ดูตัวอย่าง
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(document)}
              disabled={download.isPending}
            >
              <Download className="size-4" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
