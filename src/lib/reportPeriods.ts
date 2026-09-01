import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatDateBR, todayISO } from './format'

export type ReportKind = 'daily' | 'weekly' | 'monthly' | 'custom'

export const reportKindLabels: Record<ReportKind, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  custom: 'Personalizado',
}

function toISO(d: Date) {
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

export function resolveReportRange(
  kind: ReportKind,
  anchorDate: string,
  anchorMonth: string,
  customStart: string,
  customEnd: string,
): { start: string; end: string; title: string } {
  switch (kind) {
    case 'daily':
      return { start: anchorDate, end: anchorDate, title: `Relatório do dia ${formatDateBR(anchorDate)}` }
    case 'weekly': {
      const d = parseISO(anchorDate)
      const start = toISO(startOfWeek(d, { weekStartsOn: 1 }))
      const end = toISO(endOfWeek(d, { weekStartsOn: 1 }))
      return { start, end, title: `${formatDateBR(start)} até ${formatDateBR(end)}` }
    }
    case 'monthly': {
      const [y, m] = (anchorMonth || todayISO().slice(0, 7)).split('-').map(Number)
      const ref = new Date(y, m - 1, 1)
      const start = toISO(startOfMonth(ref))
      const end = toISO(endOfMonth(ref))
      const label = format(ref, 'MMMM/yyyy', { locale: ptBR })
      return { start, end, title: label.charAt(0).toUpperCase() + label.slice(1) }
    }
    case 'custom':
      return { start: customStart, end: customEnd, title: `${formatDateBR(customStart)} até ${formatDateBR(customEnd)}` }
  }
}
