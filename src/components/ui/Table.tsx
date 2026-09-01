import type { HTMLAttributes, TableHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function TableContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-x-auto rounded-xl border border-border', className)} {...props} />
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full min-w-[640px] border-collapse text-left text-sm', className)} {...props} />
}

export function Thead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-surface text-xs uppercase text-muted', className)} {...props} />
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3 font-medium', className)} {...props} />
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 text-foreground', className)} {...props} />
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-t border-border', className)} {...props} />
}
