export function cssColor(varName: string, fallback = '#000000') {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value ? `rgb(${value})` : fallback
}
