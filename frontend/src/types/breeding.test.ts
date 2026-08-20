import { describe, expect, it } from 'vitest'
import { getNextBreedingStage } from '@/types/breeding'
import type { BreedingEvent, BreedingEventStatus } from '@/types/breeding'

function eventWithStatus(status: BreedingEventStatus): BreedingEvent {
  return {
    id: 1,
    booking: { id: 1, booking_number: 'BK-1', status: 'IN_PROGRESS' },
    status,
    event_date: '2026-01-01',
    description: null,
    recorded_by: { id: 1, username: 'admin' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('getNextBreedingStage', () => {
  it('returns RECEIVED (the first stage) when there are no events yet', () => {
    expect(getNextBreedingStage([])).toBe('RECEIVED')
  })

  it.each([
    ['RECEIVED', 'BREEDING'],
    ['BREEDING', 'BREEDING_COMPLETED'],
    ['BREEDING_COMPLETED', 'WAITING_EGG'],
    ['WAITING_EGG', 'EGG_LAID'],
    ['EGG_LAID', 'INCUBATION'],
    ['INCUBATION', 'HATCHING'],
  ] satisfies [BreedingEventStatus, BreedingEventStatus][])(
    'returns %s -> %s (mirrors apps.breeding.services.BREEDING_TRANSITIONS)',
    (current, expected) => {
      expect(getNextBreedingStage([eventWithStatus(current)])).toBe(expected)
    },
  )

  it('returns null once HATCHING has been recorded (terminal stage)', () => {
    expect(getNextBreedingStage([eventWithStatus('HATCHING')])).toBeNull()
  })

  it('only looks at the last event in the array (events are assumed ordered oldest-to-newest, matching the backend response order)', () => {
    const events = [eventWithStatus('RECEIVED'), eventWithStatus('BREEDING')]
    expect(getNextBreedingStage(events)).toBe('BREEDING_COMPLETED')
  })
})
