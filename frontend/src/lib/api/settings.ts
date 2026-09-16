import { api } from '@/lib/api/client'

export interface FarmSetting {
  farm_name: string
  farm_logo: string | null
  farm_address: string
  owner_name: string
  bank_name: string
  account_number: string
  account_holder: string
  promptpay: string
}

export async function getFarmSetting(): Promise<FarmSetting> {
  const { data } = await api.get<FarmSetting>('/settings/farm/')
  return data
}

export async function updateFarmSetting(values: Partial<FarmSetting> & { farm_logo_file?: File | null }): Promise<FarmSetting> {
  const { farm_logo_file, ...rest } = values
  if (farm_logo_file !== undefined) {
    const form = new FormData()
    Object.entries(rest).forEach(([k, v]) => {
      if (v != null) form.append(k, String(v))
    })
    if (farm_logo_file) form.append('farm_logo', farm_logo_file)
    const { data } = await api.patch<FarmSetting>('/settings/farm/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }
  const { data } = await api.patch<FarmSetting>('/settings/farm/', rest)
  return data
}
