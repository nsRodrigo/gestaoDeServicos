import { todayISO, isoDateAddDays } from './format'

export type PeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom'

export const periodLabels: Record<PeriodPreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  last7: 'Últimos 7 dias',
  last30: 'Últimos 30 dias',
  thisMonth: 'Este mês',
  custom: 'Período personalizado',
}

export function resolvePeriod(preset: PeriodPreset, customStart?: string, customEnd?: string) {
  const today = todayISO()
  switch (preset) {
    case 'today':
      return { start: today, end: today }
    case 'yesterday': {
      const y = isoDateAddDays(today, -1)
      return { start: y, end: y }
    }
    case 'last7':
      return { start: isoDateAddDays(today, -6), end: today }
    case 'last30':
      return { start: isoDateAddDays(today, -29), end: today }
    case 'thisMonth': {
      const [y, m] = today.split('-')
      return { start: `${y}-${m}-01`, end: today }
    }
    case 'custom':
      return { start: customStart || today, end: customEnd || today }
  }
}
