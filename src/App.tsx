import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AdminRoute } from '@/routes/AdminRoute'
import { RequireCompanyContext } from '@/routes/RequireCompanyContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminShell } from '@/components/layout/AdminShell'
import { LoadingState } from '@/components/ui/LoadingState'
import Login from '@/pages/Login'
import SignUp from '@/pages/SignUp'
import ForgotPassword from '@/pages/ForgotPassword'
import AppointmentsList from '@/pages/Appointments/AppointmentsList'
import NewAppointment from '@/pages/Appointments/NewAppointment'
import NewSale from '@/pages/Appointments/NewSale'
import EditAppointment from '@/pages/Appointments/EditAppointment'
import More from '@/pages/More'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Services = lazy(() => import('@/pages/Services'))
const Products = lazy(() => import('@/pages/Products'))
const Clients = lazy(() => import('@/pages/Clients'))
const PaymentMethods = lazy(() => import('@/pages/PaymentMethods'))
const Reports = lazy(() => import('@/pages/Reports'))
const Settings = lazy(() => import('@/pages/Settings'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Admin = lazy(() => import('@/pages/Admin'))
const CompanySelector = lazy(() => import('@/pages/CompanySelector'))

function Suspended({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/criar-conta" element={<SignUp />} />
      <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        {/* Só admin: escolher a empresa (conta) a visualizar, e gerenciar contas — não
            exige ter uma empresa selecionada. */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminShell />}>
            <Route path="/empresas" element={<Suspended><CompanySelector /></Suspended>} />
            <Route path="/administracao" element={<Suspended><Admin /></Suspended>} />
          </Route>
        </Route>

        {/* Todo o resto: dados de uma empresa. Usuário comum sempre vê a própria;
            admin precisa ter entrado em uma empresa pelo /empresas primeiro. */}
        <Route element={<RequireCompanyContext />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Suspended><Dashboard /></Suspended>} />
            <Route path="/atendimentos" element={<AppointmentsList />} />
            <Route path="/atendimentos/novo" element={<NewAppointment />} />
            <Route path="/vendas/novo" element={<NewSale />} />
            <Route path="/atendimentos/:id/editar" element={<EditAppointment />} />
            <Route path="/tipos-de-corte" element={<Suspended><Services /></Suspended>} />
            <Route path="/produtos-extras" element={<Suspended><Products /></Suspended>} />
            <Route path="/clientes" element={<Suspended><Clients /></Suspended>} />
            <Route path="/formas-pagamento" element={<Suspended><PaymentMethods /></Suspended>} />
            <Route path="/relatorios" element={<Suspended><Reports /></Suspended>} />
            <Route path="/configuracoes" element={<Suspended><Settings /></Suspended>} />
            <Route path="/notificacoes" element={<Suspended><Notifications /></Suspended>} />
            <Route path="/mais" element={<More />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
