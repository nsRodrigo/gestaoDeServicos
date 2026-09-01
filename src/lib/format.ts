import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0)
}

/** Parses a "1234,56" or "1234.56" BRL-style string typed by the user into a number. */
export function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,-]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Formats a "YYYY-MM-DD" date-only string as DD/MM/YYYY without timezone drift. */
export function formatDateBR(isoDate: string | null | undefined) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

export function formatTimeBR(time: string | null | undefined) {
  if (!time) return ''
  return time.slice(0, 5)
}

export function formatDateTimeBR(isoDate: string, time: string) {
  return `${formatDateBR(isoDate)} ${formatTimeBR(time)}`
}

export function formatWeekdayLong(isoDate: string) {
  return format(parseISO(isoDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function todayISO() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

export function nowTimeHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Client's name if set, otherwise the sequential fallback label ("Atendimento 12"). */
export function appointmentLabel(appt: { client_name: string | null; appointment_number: number }) {
  return appt.client_name || `Atendimento ${appt.appointment_number}`
}

export function isoDateAddDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10)
}
