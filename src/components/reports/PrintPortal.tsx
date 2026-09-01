import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

export function PrintPortal({ children }: { children: ReactNode }) {
  const target = document.getElementById('print-root')
  if (!target) return null
  return createPortal(children, target)
}
