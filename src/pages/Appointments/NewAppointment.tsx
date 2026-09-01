import AppointmentForm from './AppointmentForm'

export default function NewAppointment() {
  return (
    <div>
      <h1 className="mb-4 hidden text-xl font-semibold md:block">Novo atendimento</h1>
      <AppointmentForm mode="create" />
    </div>
  )
}
