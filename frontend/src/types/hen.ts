export type HenStatus = 'ACTIVE' | 'INACTIVE'

export interface Hen {
  id: number
  owner: number
  owner_username: string
  name: string
  breed: string | null
  bloodline: string | null
  age_months: number | null
  history: string | null
  image: string | null
  status: HenStatus
  created_at: string
  updated_at: string
}

/** Values held by the create/edit form — numbers stay as strings while the user is typing. */
export interface HenFormValues {
  name: string
  breed: string
  bloodline: string
  age_months: string
  history: string
  status: HenStatus
  image: File | null
}

export interface HenListParams {
  page?: number
  search?: string
  status?: HenStatus | ''
  ordering?: string
}
