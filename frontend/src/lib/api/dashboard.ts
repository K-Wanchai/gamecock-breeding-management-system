import { api } from '@/lib/api/client'
import type { DashboardSummary } from '@/types/dashboard'

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<DashboardSummary>('/dashboard/')
  return data
}
