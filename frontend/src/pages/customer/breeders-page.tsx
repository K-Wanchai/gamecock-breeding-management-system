import { useState } from 'react'
import { CalendarPlus, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionLoading } from '@/components/shared/loading'
import { QueryError } from '@/components/shared/query-error'
import { Pagination } from '@/components/shared/pagination'
import { BookingFormDialog } from '@/components/bookings/booking-form-dialog'
import { useBreedersQuery } from '@/hooks/use-breeders'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { Breeder } from '@/types/breeder'

const PAGE_SIZE = 20

export function BreedersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [bookingBreeder, setBookingBreeder] = useState<Breeder | null>(null)

  const { data, isLoading, isError, refetch } = useBreedersQuery({
    page,
    search: debouncedSearch || undefined,
    status: 'ACTIVE',
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ค้นหาพ่อพันธุ์</h1>
      </div>

      <Input
        placeholder="ค้นหาชื่อ, สายพันธุ์, สายเลือด..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-xs"
      />

      {isLoading ? (
        <SectionLoading />
      ) : isError ? (
        <QueryError onRetry={refetch} />
      ) : !data || data.results.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">ไม่พบพ่อพันธุ์ที่เปิดให้บริการ</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((breeder) => (
              <Card key={breeder.id} className="overflow-hidden pt-0">
                <div className="flex h-40 items-center justify-center bg-muted">
                  {breeder.image ? (
                    <img
                      src={breeder.image}
                      alt={breeder.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageOff className="size-8 text-muted-foreground" />
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {breeder.name}
                    {breeder.remaining_quota_this_month > 0 ? (
                      <Badge>เหลือ {breeder.remaining_quota_this_month} คิว</Badge>
                    ) : (
                      <Badge variant="secondary">เต็มเดือนนี้</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <p>สายพันธุ์: {breeder.breed || '-'}</p>
                  <p className="text-base font-semibold text-foreground">
                    ราคา {breeder.service_rate} บาท
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => setBookingBreeder(breeder)}>
                    <CalendarPlus className="size-4" />
                    ซื้อล็อคฝากผสม
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onPageChange={setPage} />
        </>
      )}

      {bookingBreeder && (
        <BookingFormDialog
          key={bookingBreeder.id}
          open={Boolean(bookingBreeder)}
          onOpenChange={(open) => !open && setBookingBreeder(null)}
          breeder={bookingBreeder}
        />
      )}
    </div>
  )
}
