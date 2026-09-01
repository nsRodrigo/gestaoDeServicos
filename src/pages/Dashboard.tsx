import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarClock, Scissors } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { usePeriodSummary } from '@/hooks/useReports'
import { useAppointmentsByPeriod } from '@/hooks/useAppointments'
import { formatCurrency, formatDateBR, formatTimeBR, formatWeekdayLong, todayISO, isoDateAddDays, appointmentLabel } from '@/lib/format'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'

export default function Dashboard() {
  const navigate = useNavigate()
  const { displayName } = useAuth()
  const [date, setDate] = useState(todayISO())

  const { data: day, isLoading } = usePeriodSummary(date, date)
  const last7Start = isoDateAddDays(date, -6)
  const { data: last30 } = usePeriodSummary(isoDateAddDays(date, -29), date)
  const { data: recent } = useAppointmentsByPeriod(date, date)

  const chartData = useMemo(() => {
    const byDay = new Map((last30?.by_day ?? []).map((d) => [d.date, d]))
    const days: { date: string; label: string; amount: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = isoDateAddDays(last7Start, i)
      const entry = byDay.get(d)
      days.push({ date: d, label: formatDateBR(d).slice(0, 5), amount: entry?.amount ?? 0 })
    }
    return days
  }, [last30, last7Start])

  const topServices = (last30?.services ?? []).slice(0, 5)

  const recentSorted = [...(recent ?? [])].sort((a, b) => b.appointment_time.localeCompare(a.appointment_time)).slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Olá, {displayName}</h1>
          <p className="text-sm capitalize text-muted">{formatWeekdayLong(date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button onClick={() => navigate('/atendimentos/novo')} className="hidden md:inline-flex">
            <Plus className="h-4 w-4" /> Novo atendimento
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card>
              <CardTitle>Cortes / Atendimentos</CardTitle>
              <p className="text-2xl font-bold">{day?.total_appointments ?? 0}</p>
            </Card>
            <Card>
              <CardTitle>Faturamento serviços</CardTitle>
              <p className="text-2xl font-bold text-gold">{formatCurrency(day?.total_services_amount)}</p>
            </Card>
            <Card>
              <CardTitle>Faturamento extras</CardTitle>
              <p className="text-2xl font-bold text-gold">{formatCurrency(day?.total_products_amount)}</p>
            </Card>
            <Card>
              <CardTitle>Faturamento total</CardTitle>
              <p className="text-2xl font-bold text-gold">{formatCurrency(day?.total_amount)}</p>
            </Card>
            <Card>
              <CardTitle>Ticket médio</CardTitle>
              <p className="text-2xl font-bold">{formatCurrency(day?.average_ticket)}</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>Evolução do faturamento — últimos 7 dias</CardTitle>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -20, top: 10 }}>
                    <defs>
                      <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4af37" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="label" stroke="#9a9a9a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9a9a9a" fontSize={12} tickLine={false} axisLine={false} width={60} />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ background: '#141414', border: '1px solid #262626', borderRadius: 8, color: '#f5f5f5' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#d4af37" fill="url(#gold-fill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardTitle>Serviços mais realizados — últimos 30 dias</CardTitle>
              {topServices.length === 0 ? (
                <EmptyState icon={Scissors} title="Sem dados no período." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topServices} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" stroke="#9a9a9a" fontSize={12} width={90} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(v: number) => `${v}x`}
                        contentStyle={{ background: '#141414', border: '1px solid #262626', borderRadius: 8, color: '#f5f5f5' }}
                      />
                      <Bar dataKey="quantity" fill="#d4af37" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Últimos atendimentos</h2>
            {recentSorted.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Você ainda não possui atendimentos hoje."
                action={
                  <Button onClick={() => navigate('/atendimentos/novo')}>
                    <Plus className="h-4 w-4" /> Registrar primeiro atendimento
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                {recentSorted.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={() => navigate(`/atendimentos/${appt.id}/editar`)}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 text-left hover:border-gold/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatTimeBR(appt.appointment_time)} · {appointmentLabel(appt)}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {appt.appointment_services.map((s) => s.service_name_snapshot).join(' + ')}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gold">{formatCurrency(appt.total_amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
