import type { PeriodSummary } from '@/types/database'
import { formatCurrency, formatDateBR } from '@/lib/format'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileBarChart } from 'lucide-react'

export function ReportPreview({ summary }: { summary: PeriodSummary }) {
  if (summary.total_appointments === 0) {
    return <EmptyState icon={FileBarChart} title="Nenhum atendimento neste período." description="Escolha outro período para gerar o relatório." />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card><CardTitle>Atendimentos</CardTitle><p className="text-xl font-bold">{summary.total_appointments}</p></Card>
        <Card><CardTitle>Serviços realizados</CardTitle><p className="text-xl font-bold">{summary.total_services_qty}</p></Card>
        <Card><CardTitle>Ticket médio</CardTitle><p className="text-xl font-bold">{formatCurrency(summary.average_ticket)}</p></Card>
        <Card><CardTitle>Faturamento serviços</CardTitle><p className="text-xl font-bold text-gold">{formatCurrency(summary.total_services_amount)}</p></Card>
        <Card><CardTitle>Faturamento extras</CardTitle><p className="text-xl font-bold text-gold">{formatCurrency(summary.total_products_amount)}</p></Card>
        <Card><CardTitle>Faturamento total</CardTitle><p className="text-xl font-bold text-gold">{formatCurrency(summary.total_amount)}</p></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Serviços realizados</CardTitle>
          <div className="flex flex-col divide-y divide-border">
            {summary.services.map((s) => (
              <div key={s.id ?? s.name} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted">Quantidade: {s.quantity}</p>
                </div>
                <span className="font-semibold text-gold">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Extras vendidos</CardTitle>
          {summary.products.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nenhum extra vendido no período.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {summary.products.map((p) => (
                <div key={p.id ?? p.name} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted">Quantidade: {p.quantity}</p>
                  </div>
                  <span className="font-semibold text-gold">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {summary.by_day.length > 1 && (
        <Card>
          <CardTitle>Detalhamento por dia</CardTitle>
          <div className="flex flex-col divide-y divide-border">
            {summary.by_day.map((d) => (
              <div key={d.date} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{formatDateBR(d.date)}</span>
                <span className="text-muted">{d.appointments} atendimentos</span>
                <span className="font-semibold text-gold">{formatCurrency(d.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
