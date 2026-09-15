import { api } from '@/lib/api/client'

export interface FarmSetting {
  farm_name: string
  farm_address: string
  bank_name: string
  account_number: string
  account_holder: string
  promptpay: string
}

export async function getFarmSetting(): Promise<FarmSetting> {
  const { data } = await api.get<FarmSetting>('/settings/farm/')
  return data
}

export async function updateFarmSetting(values: Partial<FarmSetting>): Promise<FarmSetting> {
  const { data } = await api.patch<FarmSetting>('/settings/farm/', values)
  return data
}
