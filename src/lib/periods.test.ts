import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePeriod } from './periods'

describe('resolvePeriod', () => {
  beforeEach(() => {
    // 2026-09-02 12:00 local time, fixed so date-based presets are deterministic.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 2, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('today resolves to the current date on both ends', () => {
    expect(resolvePeriod('today')).toEqual({ start: '2026-09-02', end: '2026-09-02' })
  })

  it('upcoming spans 90 days starting today', () => {
    expect(resolvePeriod('upcoming')).toEqual({ start: '2026-09-02', end: '2026-12-01' })
  })

  it('yesterday resolves to the day before', () => {
    expect(resolvePeriod('yesterday')).toEqual({ start: '2026-09-01', end: '2026-09-01' })
  })

  it('last7 spans 7 days including today', () => {
    expect(resolvePeriod('last7')).toEqual({ start: '2026-08-27', end: '2026-09-02' })
  })

  it('last30 spans 30 days including today', () => {
    expect(resolvePeriod('last30')).toEqual({ start: '2026-08-04', end: '2026-09-02' })
  })

  it('thisMonth starts on the 1st of the current month', () => {
    expect(resolvePeriod('thisMonth')).toEqual({ start: '2026-09-01', end: '2026-09-02' })
  })

  it('custom uses the provided bounds', () => {
    expect(resolvePeriod('custom', '2026-01-01', '2026-01-15')).toEqual({
      start: '2026-01-01',
      end: '2026-01-15',
    })
  })

  it('custom falls back to today when bounds are missing', () => {
    expect(resolvePeriod('custom')).toEqual({ start: '2026-09-02', end: '2026-09-02' })
  })
})
