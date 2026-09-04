import { periodLabels, type PeriodPreset } from '@/lib/periods'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface PeriodFilterProps {
  preset: PeriodPreset
  onPresetChange: (preset: PeriodPreset) => void
  customStart: string
  customEnd: string
  onCustomChange: (start: string, end: string) => void
}

const presets: PeriodPreset[] = ['today', 'upcoming', 'yesterday', 'last7', 'last30', 'thisMonth', 'custom']

export function PeriodFilter({ preset, onPresetChange, customStart, customEnd, onCustomChange }: PeriodFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onPresetChange(p)}
            className={cn(
              'shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted',
              preset === p && 'border-gold bg-gold/10 text-gold',
            )}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="De" type="date" value={customStart} onChange={(e) => onCustomChange(e.target.value, customEnd)} />
          <Input label="Até" type="date" value={customEnd} onChange={(e) => onCustomChange(customStart, e.target.value)} />
        </div>
      )}
    </div>
  )
}
