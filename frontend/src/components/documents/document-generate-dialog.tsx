import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChickPicker } from '@/components/chicks/chick-picker'
import { useGenerateDocument, usePreviewDocument } from '@/hooks/use-documents'
import { toastApiError } from '@/lib/toast'
import { DOCUMENT_TYPE_LABEL, GENERATABLE_DOCUMENT_TYPES } from '@/types/document'
import type { Chick } from '@/types/chick'
import type { GeneratableDocumentType } from '@/types/document'

interface DocumentGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected when opened from a chick's own page — otherwise the admin picks one via ChickPicker. */
  chick?: Chick
}

/** Only chick, document_type are ever sent — every other field on the PDF is read server-side from the chick's own relationship chain. */
export function DocumentGenerateDialog({ open, onOpenChange, chick }: DocumentGenerateDialogProps) {
  const [pickedChick, setPickedChick] = useState<Chick | null>(chick ?? null)
  const [documentType, setDocumentType] = useState<GeneratableDocumentType>('PEDIGREE_CERTIFICATE')

  const generateDocument = useGenerateDocument()
  const preview = usePreviewDocument()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!pickedChick) {
      toast.error('กรุณาเลือกลูกไก่')
      return
    }
    generateDocument.mutate(
      { chick: pickedChick.id, document_type: documentType },
      {
        onSuccess: (document) => {
          toast.success(`สร้างเอกสาร ${document.document_number} แล้ว`)
          onOpenChange(false)
          preview.mutate(document.id, {
            onSuccess: (blobUrl) => {
              window.open(blobUrl, '_blank')
              setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
            },
          })
        },
        onError: toastApiError,
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>สร้างเอกสาร</DialogTitle>
          <DialogDescription>เอกสารแต่ละประเภทสร้างได้เพียงครั้งเดียวต่อลูกไก่หนึ่งตัว</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!chick && <ChickPicker value={pickedChick} onChange={setPickedChick} />}

          <div className="flex flex-col gap-2">
            <Label htmlFor="document_type">ประเภทเอกสาร</Label>
            <Select
              value={documentType}
              onValueChange={(value: GeneratableDocumentType) => setDocumentType(value)}
            >
              <SelectTrigger id="document_type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENERATABLE_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {DOCUMENT_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={generateDocument.isPending}>
              {generateDocument.isPending ? 'กำลังสร้าง...' : 'สร้างเอกสาร'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
