import { describe, expect, it } from 'vitest'
import {
  appointmentLabel,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatTimeBR,
  isoDateAddDays,
  parseCurrencyInput,
} from './format'

describe('formatCurrency', () => {
  it('formats a number as BRL', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50')
  })

  it('treats null/undefined as zero', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00')
    expect(formatCurrency(undefined)).toBe('R$ 0,00')
  })
})

describe('parseCurrencyInput', () => {
  it('parses a comma-decimal BRL string', () => {
    expect(parseCurrencyInput('1234,56')).toBe(1234.56)
  })

  it('treats a dot as a thousands separator, not a decimal point', () => {
    // '.' is stripped (only digits, comma and '-' survive) — matches the BRL-masked
    // CurrencyInput, which never lets the user type a literal decimal dot.
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56)
    expect(parseCurrencyInput('1234.56')).toBe(123456)
  })

  it('falls back to 0 for garbage input', () => {
    expect(parseCurrencyInput('abc')).toBe(0)
  })
})

describe('formatDateBR', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY without timezone drift', () => {
    expect(formatDateBR('2026-09-02')).toBe('02/09/2026')
  })

  it('returns empty string for falsy input', () => {
    expect(formatDateBR(null)).toBe('')
    expect(formatDateBR(undefined)).toBe('')
  })
})

describe('formatTimeBR', () => {
  it('truncates seconds', () => {
    expect(formatTimeBR('14:30:00')).toBe('14:30')
  })

  it('returns empty string for falsy input', () => {
    expect(formatTimeBR(null)).toBe('')
  })
})

describe('formatDateTimeBR', () => {
  it('combines date and time', () => {
    expect(formatDateTimeBR('2026-09-02', '14:30:00')).toBe('02/09/2026 14:30')
  })
})

describe('isoDateAddDays', () => {
  it('adds days across a month boundary', () => {
    expect(isoDateAddDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('subtracts days across a year boundary', () => {
    expect(isoDateAddDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('appointmentLabel', () => {
  it('uses the client name when present', () => {
    expect(appointmentLabel({ client_name: 'Fulano', appointment_number: 12 })).toBe('Fulano')
  })

  it('falls back to the sequential label when there is no client name', () => {
    expect(appointmentLabel({ client_name: null, appointment_number: 12 })).toBe('Atendimento 12')
  })
})
