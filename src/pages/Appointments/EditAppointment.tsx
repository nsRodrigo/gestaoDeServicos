import { useParams } from 'react-router-dom'
import { useAppointment } from '@/hooks/useAppointments'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import AppointmentForm from './AppointmentForm'

export default function EditAppointment() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useAppointment(id)

  if (isLoading) return <LoadingState label="Carregando atendimento..." />
  if (!data) return <EmptyState title="Atendimento não encontrado" />

  return (
    <div>
      <h1 className="mb-4 hidden text-xl font-semibold md:block">Editar atendimento</h1>
      <AppointmentForm mode="edit" appointmentId={id} initialData={data} />
    </div>
  )
}
