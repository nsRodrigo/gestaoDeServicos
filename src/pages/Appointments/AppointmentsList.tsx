import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Trash2, CalendarClock, Plus, ShoppingBag } from 'lucide-react'
import { useAppointmentsByPeriod, useAppointmentMutations } from '@/hooks/useAppointments'
import { resolvePeriod, type PeriodPreset } from '@/lib/periods'
import { formatCurrency, formatDateBR, formatTimeBR, todayISO, appointmentLabel } from '@/lib/format'
import type { AppointmentWithItems } from '@/types/database'
import { PeriodFilter } from '@/components/PeriodFilter'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { TableContainer, Table, Thead, Th, Tr, Td } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

function TypeBadge({ appt }: { appt: AppointmentWithItems }) {
  return appt.type === 'venda' ? (
    <Badge variant="gold">Venda</Badge>
  ) : (
    <Badge variant="neutral">Atendimento</Badge>
  )
}

function itemsSummary(appt: AppointmentWithItems) {
  const services = appt.appointment_services.map((s) => s.service_name_snapshot).join(' + ')
  const products = appt.appointment_products.map((p) => `${p.product_name_snapshot} x${p.quantity}`).join(', ')
  return { services, products }
}

export default function AppointmentsList() {
  const navigate = useNavigate()
  const toast = useToast()
  const [preset, setPreset] = useState<PeriodPreset>('today')
  const [customStart, setCustomStart] = useState(todayISO())
  const [customEnd, setCustomEnd] = useState(todayISO())
  const { start, end } = resolvePeriod(preset, customStart, customEnd)

  const { data: appointments, isLoading } = useAppointmentsByPeriod(start, end)
  const { remove } = useAppointmentMutations()

  const [viewing, setViewing] = useState<AppointmentWithItems | null>(null)
  const [deleting, setDeleting] = useState<AppointmentWithItems | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Atendimento excluído.')
      setDeleting(null)
    } catch {
      toast.error('Não foi possível excluir o atendimento.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PeriodFilter
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomChange={(s, e) => {
          setCustomStart(s)
          setCustomEnd(e)
        }}
      />

      {isLoading ? (
        <LoadingState />
      ) : !appointments || appointments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhum atendimento neste período."
          description="Registre um novo atendimento para começar."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/atendimentos/novo')}>
                <Plus className="h-4 w-4" /> Registrar atendimento
              </Button>
              <Button variant="secondary" onClick={() => navigate('/vendas/novo')}>
                <ShoppingBag className="h-4 w-4" /> Nova venda
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {appointments.map((appt) => {
              const { services, products } = itemsSummary(appt)
              return (
                <div key={appt.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {formatTimeBR(appt.appointment_time)}
                          {appt.type === 'atendimento' && ` · ${appt.duration_minutes} min`} · {appointmentLabel(appt)}
                        </p>
                        <TypeBadge appt={appt} />
                      </div>
                      <p className="mt-1 truncate text-sm text-muted">{services}</p>
                      {products && <p className="truncate text-xs text-muted">{products}</p>}
                      {appt.payment_method_name_snapshot && (
                        <p className="mt-0.5 truncate text-xs text-muted">{appt.payment_method_name_snapshot}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gold">{formatCurrency(appt.total_amount)}</span>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(appt)}>
                      <Eye className="h-4 w-4" /> Ver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/atendimentos/${appt.id}/editar`)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={() => setDeleting(appt)}>
                      <Trash2 className="h-4 w-4" /> Excluir
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop: table */}
          <TableContainer className="hidden md:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Data</Th>
                  <Th>Horário</Th>
                  <Th>Tipo</Th>
                  <Th>Cliente</Th>
                  <Th>Serviços</Th>
                  <Th>Extras</Th>
                  <Th>Pagamento</Th>
                  <Th>Total</Th>
                  <Th>Ações</Th>
                </Tr>
              </Thead>
              <tbody>
                {appointments.map((appt) => {
                  const { services, products } = itemsSummary(appt)
                  return (
                    <Tr key={appt.id}>
                      <Td>{formatDateBR(appt.appointment_date)}</Td>
                      <Td>{formatTimeBR(appt.appointment_time)}{appt.type === 'atendimento' && ` · ${appt.duration_minutes} min`}</Td>
                      <Td><TypeBadge appt={appt} /></Td>
                      <Td>{appointmentLabel(appt)}</Td>
                      <Td className="max-w-[220px] truncate">{services}</Td>
                      <Td className="max-w-[180px] truncate">{products || '—'}</Td>
                      <Td>{appt.payment_method_name_snapshot || '—'}</Td>
                      <Td className="font-semibold text-gold">{formatCurrency(appt.total_amount)}</Td>
                      <Td>
                        <div className="flex gap-1">
                          <button onClick={() => setViewing(appt)} className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground" aria-label="Ver">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/atendimentos/${appt.id}/editar`)} className="rounded p-1.5 text-muted hover:bg-surface-hover hover:text-foreground" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleting(appt)} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </TableContainer>
        </>
      )}

      <Modal open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} title="Detalhes do atendimento">
        {viewing && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>
                {formatDateBR(viewing.appointment_date)} às {formatTimeBR(viewing.appointment_time)}
                {viewing.type === 'atendimento' && ` · ${viewing.duration_minutes} min`}
              </span>
              <span className="flex items-center gap-2">
                {appointmentLabel(viewing)} <TypeBadge appt={viewing} />
              </span>
            </div>
            {viewing.type === 'atendimento' && (
              <div>
                <p className="mb-1 font-medium text-muted">Serviços</p>
                {viewing.appointment_services.map((s) => (
                  <div key={s.id} className="flex justify-between py-0.5">
                    <span>{s.service_name_snapshot} x{s.quantity}</span>
                    <span>{formatCurrency(s.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {viewing.appointment_products.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-muted">Extras</p>
                {viewing.appointment_products.map((p) => (
                  <div key={p.id} className="flex justify-between py-0.5">
                    <span>{p.product_name_snapshot} x{p.quantity}</span>
                    <span>{formatCurrency(p.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {viewing.payment_method_name_snapshot && (
              <div className="flex justify-between">
                <span className="font-medium text-muted">Forma de pagamento</span>
                <span className="text-foreground">{viewing.payment_method_name_snapshot}</span>
              </div>
            )}
            {viewing.notes && (
              <div>
                <p className="mb-1 font-medium text-muted">Observação</p>
                <p className="text-foreground">{viewing.notes}</p>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span className="text-gold">{formatCurrency(viewing.total_amount)}</span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir atendimento?"
        description="Essa ação não pode ser desfeita. O estoque de produtos utilizados será restaurado."
        confirmLabel="Excluir"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
