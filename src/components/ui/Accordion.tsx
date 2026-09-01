import * as RadixAccordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <RadixAccordion.Root type="multiple" className={cn('flex flex-col gap-2', className)}>
      {children}
    </RadixAccordion.Root>
  )
}

export function AccordionItem({
  value,
  title,
  children,
}: {
  value: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <RadixAccordion.Item value={value} className="overflow-hidden rounded-xl border border-border bg-surface">
      <RadixAccordion.Header>
        <RadixAccordion.Trigger className="group flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-foreground">
          {title}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-data-[state=open]:rotate-180" />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content className="overflow-hidden data-[state=open]:animate-[accordion-down_0.2s_ease-out] data-[state=closed]:animate-[accordion-up_0.2s_ease-out]">
        <div className="border-t border-border px-4 py-3">{children}</div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  )
}
