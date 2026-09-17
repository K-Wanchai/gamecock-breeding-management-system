import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const THAI_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  calendar: 'buddhist',
}

const THAI_DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  calendar: 'buddhist',
}

/**
 * Formats a date string (YYYY-MM-DD) or ISO datetime to Thai Buddhist Era format.
 * e.g. "2026-09-16" → "16 กันยายน 2569"
 * Appends "T00:00:00" when given a plain date string so the browser doesn't shift
 * the day due to UTC-to-local conversion.
 */
export function formatThaiDate(value: string | null | undefined): string {
  if (!value) return '-'
  const iso = value.length === 10 ? `${value}T00:00:00` : value
  return new Date(iso).toLocaleDateString('th-TH-u-ca-buddhist', THAI_DATE_FORMAT)
}

/**
 * Formats an ISO datetime string to Thai Buddhist Era format with time.
 * e.g. "2026-09-16T10:30:00Z" → "16 กันยายน 2569 10:30"
 */
export function formatThaiDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH-u-ca-buddhist', THAI_DATETIME_FORMAT)
}
