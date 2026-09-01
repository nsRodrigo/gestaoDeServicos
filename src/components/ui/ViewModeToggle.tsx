import { LayoutGrid, List } from 'lucide-react'
import type { ViewMode } from '@/hooks/useViewMode'
import { cn } from '@/lib/utils'

export function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex shrink-0 rounded-lg border border-border bg-surface p-1">
      <button
        type="button"
        aria-label="Visualizar em grade"
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          mode === 'grid' ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Visualizar em lista"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          mode === 'list' ? 'bg-gold/15 text-gold' : 'text-muted hover:text-foreground',
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  )
}
