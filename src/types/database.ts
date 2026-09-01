export type Status = 'active' | 'inactive'
export type LoyaltyPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual'
export type UserRole = 'user' | 'admin'
export type AccountStatus = 'pending' | 'active' | 'blocked'
export type AppTheme = 'dark' | 'light' | 'a11y'

export interface ServiceRow {
  id: string
  user_id: string
  name: string
  description: string | null
  price: number
  status: Status
  created_at: string
  updated_at: string
}

export interface ProductRow {
  id: string
  user_id: string
  name: string
  description: string | null
  price: number
  stock_control: boolean
  stock_quantity: number
  minimum_stock: number
  status: Status
  created_at: string
  updated_at: string
}

export interface ClientRow {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null
  status: Status
  loyalty_enabled: boolean
  loyalty_period: LoyaltyPeriod | null
  loyalty_visits_required: number | null
  created_at: string
  updated_at: string
}

export interface PaymentMethodRow {
  id: string
  user_id: string
  name: string
  status: Status
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AppointmentRow {
  id: string
  user_id: string
  client_id: string | null
  client_name: string | null
  notes: string | null
  appointment_date: string
  appointment_time: string
  appointment_number: number
  payment_method_id: string | null
  payment_method_name_snapshot: string | null
  total_services: number
  total_products: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface AppointmentServiceRow {
  id: string
  appointment_id: string
  service_id: string | null
  service_name_snapshot: string
  service_price_snapshot: number
  custom_price: number | null
  quantity: number
  subtotal: number
  created_at: string
}

export interface AppointmentProductRow {
  id: string
  appointment_id: string
  product_id: string | null
  product_name_snapshot: string
  product_price_snapshot: number
  custom_price: number | null
  quantity: number
  subtotal: number
  created_at: string
}

export interface AppointmentWithItems extends AppointmentRow {
  appointment_services: AppointmentServiceRow[]
  appointment_products: AppointmentProductRow[]
}

export interface ProfileRow {
  id: string
  name: string | null
  business_name: string | null
  logo_url: string | null
  theme: AppTheme
  onboarding_completed: boolean
  role: UserRole
  account_status: AccountStatus
  created_at: string
  updated_at: string
}

export interface AdminAccountRow {
  id: string
  email: string
  name: string | null
  business_name: string | null
  role: UserRole
  account_status: AccountStatus
  created_at: string
}

export interface LoyaltyAlert {
  client_name: string
  visits: number
  required: number
  period: LoyaltyPeriod
}

export interface PeriodSummary {
  start_date: string
  end_date: string
  total_appointments: number
  total_services_qty: number
  total_services_amount: number
  total_products_amount: number
  total_amount: number
  average_ticket: number
  services: { id: string; name: string; quantity: number; amount: number }[]
  products: { id: string; name: string; quantity: number; amount: number }[]
  by_day: { date: string; appointments: number; amount: number }[]
}
