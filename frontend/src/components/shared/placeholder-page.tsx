export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">หน้านี้จะถูกพัฒนาในสเต็ปถัดไป</p>
    </div>
  )
}
