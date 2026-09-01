import type { PeriodSummary } from '@/types/database'
import { formatCurrency, formatDateBR } from '@/lib/format'
import { useBusinessName } from '@/hooks/useProfile'

interface PrintReportProps {
  kindLabel: string
  periodTitle: string
  summary: PeriodSummary
  generatedAt: Date
}

export function PrintReport({ kindLabel, periodTitle, summary, generatedAt }: PrintReportProps) {
  const businessName = useBusinessName()
  return (
    <div className="mx-auto max-w-[190mm] bg-white p-8 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`@page { size: A4; margin: 16mm; }`}</style>

      <header className="border-b-2 border-black pb-3 text-center">
        <h1 className="text-lg font-bold tracking-wide">{businessName.toUpperCase()}</h1>
        <h2 className="mt-1 text-base font-semibold uppercase">Relatório {kindLabel}</h2>
        <p className="mt-1 text-sm">{periodTitle}</p>
      </header>

      <section className="mt-5">
        <h3 className="mb-2 border-b border-black text-sm font-bold uppercase">Resumo</h3>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-0.5">Total de atendimentos</td><td className="py-0.5 text-right font-semibold">{summary.total_appointments}</td></tr>
            <tr><td className="py-0.5">Total de serviços realizados</td><td className="py-0.5 text-right font-semibold">{summary.total_services_qty}</td></tr>
            <tr><td className="py-0.5">Faturamento dos serviços</td><td className="py-0.5 text-right font-semibold">{formatCurrency(summary.total_services_amount)}</td></tr>
            <tr><td className="py-0.5">Faturamento dos extras</td><td className="py-0.5 text-right font-semibold">{formatCurrency(summary.total_products_amount)}</td></tr>
            <tr><td className="py-0.5">Ticket médio</td><td className="py-0.5 text-right font-semibold">{formatCurrency(summary.average_ticket)}</td></tr>
            <tr className="border-t-2 border-black"><td className="pt-1.5 font-bold">TOTAL</td><td className="pt-1.5 text-right font-bold">{formatCurrency(summary.total_amount)}</td></tr>
          </tbody>
        </table>
      </section>

      {summary.services.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 border-b border-black text-sm font-bold uppercase">Serviços</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left"><th className="py-1 font-semibold">Serviço</th><th className="py-1 text-right font-semibold">Qtd</th><th className="py-1 text-right font-semibold">Valor</th></tr>
            </thead>
            <tbody>
              {summary.services.map((s) => (
                <tr key={s.id ?? s.name}><td className="py-0.5">{s.name}</td><td className="py-0.5 text-right">{s.quantity}</td><td className="py-0.5 text-right">{formatCurrency(s.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {summary.products.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 border-b border-black text-sm font-bold uppercase">Extras</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left"><th className="py-1 font-semibold">Produto</th><th className="py-1 text-right font-semibold">Qtd</th><th className="py-1 text-right font-semibold">Valor</th></tr>
            </thead>
            <tbody>
              {summary.products.map((p) => (
                <tr key={p.id ?? p.name}><td className="py-0.5">{p.name}</td><td className="py-0.5 text-right">{p.quantity}</td><td className="py-0.5 text-right">{formatCurrency(p.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {summary.by_day.length > 1 && (
        <section className="mt-5" style={{ breakInside: 'avoid' }}>
          <h3 className="mb-2 border-b border-black text-sm font-bold uppercase">Detalhamento por dia</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left"><th className="py-1 font-semibold">Data</th><th className="py-1 text-right font-semibold">Atendimentos</th><th className="py-1 text-right font-semibold">Faturamento</th></tr>
            </thead>
            <tbody>
              {summary.by_day.map((d) => (
                <tr key={d.date}><td className="py-0.5">{formatDateBR(d.date)}</td><td className="py-0.5 text-right">{d.appointments}</td><td className="py-0.5 text-right">{formatCurrency(d.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-8 border-t border-black pt-2 text-center text-xs">
        <p>Obrigado e volte sempre!</p>
        <p>Impresso em: {formatDateBR(generatedAt.toISOString().slice(0, 10))} {generatedAt.toTimeString().slice(0, 5)}</p>
      </footer>
    </div>
  )
}
