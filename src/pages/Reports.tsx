import { useState } from 'react'
import { Printer, FileDown } from 'lucide-react'
import { usePeriodSummary } from '@/hooks/useReports'
import { resolveReportRange, reportKindLabels, type ReportKind } from '@/lib/reportPeriods'
import { todayISO } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { ReportPreview } from '@/components/reports/ReportPreview'
import { PrintReport } from '@/components/reports/PrintReport'
import { PrintPortal } from '@/components/reports/PrintPortal'
import { cn } from '@/lib/utils'

const kinds: ReportKind[] = ['daily', 'weekly', 'monthly', 'custom']

export default function Reports() {
  const [kind, setKind] = useState<ReportKind>('daily')
  const [anchorDate, setAnchorDate] = useState(todayISO())
  const [anchorMonth, setAnchorMonth] = useState(todayISO().slice(0, 7))
  const [customStart, setCustomStart] = useState(todayISO())
  const [customEnd, setCustomEnd] = useState(todayISO())

  const { start, end, title } = resolveReportRange(kind, anchorDate, anchorMonth, customStart, customEnd)
  const { data: summary, isLoading, isError } = usePeriodSummary(start, end)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="hidden text-xl font-semibold md:block">Relatórios</h1>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              'shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted',
              kind === k && 'border-gold bg-gold/10 text-gold',
            )}
          >
            {reportKindLabels[k]}
          </button>
        ))}
      </div>

      {kind === 'daily' && (
        <Input label="Data" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className="w-auto" />
      )}
      {kind === 'weekly' && (
        <Input
          label="Selecione um dia da semana desejada"
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className="w-auto"
        />
      )}
      {kind === 'monthly' && (
        <Input label="Mês" type="month" value={anchorMonth} onChange={(e) => setAnchorMonth(e.target.value)} className="w-auto" />
      )}
      {kind === 'custom' && (
        <div className="grid grid-cols-2 gap-3 md:w-96">
          <Input label="De" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <Input label="Até" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </div>
      )}

      <p className="text-sm text-muted">Período: <span className="text-foreground">{title}</span></p>

      {isLoading ? (
        <LoadingState />
      ) : isError || !summary ? (
        <p className="text-sm text-danger">Não foi possível gerar o relatório.</p>
      ) : (
        <>
          <ReportPreview summary={summary} />

          {summary.total_appointments > 0 && (
            <div className="sticky bottom-16 z-20 flex gap-2 border-t border-border bg-background py-3 md:static md:border-0 md:bg-transparent md:py-0">
              <Button variant="secondary" onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Imprimir relatório
              </Button>
              <Button onClick={handlePrint}>
                <FileDown className="h-4 w-4" /> Gerar PDF
              </Button>
            </div>
          )}

          <PrintPortal>
            <PrintReport kindLabel={reportKindLabels[kind]} periodTitle={title} summary={summary} generatedAt={new Date()} />
          </PrintPortal>
        </>
      )}
    </div>
  )
}
