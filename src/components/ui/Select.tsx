import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
}

export function Select({ label, placeholder = 'Selecione', value, onChange, options, className }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <RadixSelect.Root value={value} onValueChange={onChange}>
        <RadixSelect.Trigger
          className={cn(
            'flex h-12 w-full items-center justify-between rounded-lg border border-border bg-surface px-3.5 text-base text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-gold/60 data-[placeholder]:text-muted',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-[60] max-h-72 w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-lg border border-border bg-surface shadow-xl"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2.5 text-sm text-foreground outline-none data-[highlighted]:bg-surface-hover data-[state=checked]:text-gold"
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
