import { useState } from 'react'

export type ViewMode = 'grid' | 'list'

export function useViewMode(key: string, initial: ViewMode = 'grid') {
  const [mode, setMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(key)
    return stored === 'list' || stored === 'grid' ? stored : initial
  })

  function update(next: ViewMode) {
    setMode(next)
    localStorage.setItem(key, next)
  }

  return [mode, update] as const
}
