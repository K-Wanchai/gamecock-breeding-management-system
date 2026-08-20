import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { useDocumentsQuery, useDownloadDocument } from '@/hooks/use-documents'
import { toastApiError } from '@/lib/toast'
import { DOCUMENT_TYPE_LABEL } from '@/types/document'
import type { Document } from '@/types/document'

const PAGE_SIZE = 20

export function DocumentsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useDocumentsQuery({ page })
  const download = useDownloadDocument()

  function handleDownload(document: Document) {
    download.mutate(
      { id: document.id, filename: `${document.document_number}.pdf` },
      { onError: toastApiError },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">เอกสารของฉัน</h1>

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ยังไม่มีเอกสาร</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>เกี่ยวข้องกับ</TableHead>
                  <TableHead>วันที่ออกเอกสาร</TableHead>
                  <TableHead className="text-right">ดาวน์โหลด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.document_number}</TableCell>
                    <TableCell>{DOCUMENT_TYPE_LABEL[document.document_type]}</TableCell>
                    <TableCell>
                      {document.chick ? (
                        <Link
                          to={`/app/chicks/${document.chick.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {document.chick.wing_clip_number}
                        </Link>
                      ) : document.booking ? (
                        <Link
                          to={`/app/bookings/${document.booking.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {document.booking.booking_number}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {document.generated_at
                        ? new Date(document.generated_at).toLocaleDateString('th-TH')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        disabled={download.isPending}
                      >
                        <Download className="size-4" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
