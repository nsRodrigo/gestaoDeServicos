import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, AlertTriangle } from 'lucide-react'
import { useAdminAccounts } from '@/hooks/useAdmin'
import { useActingAsContext } from '@/hooks/useActingAs'
import type { AdminAccountRow, AccountStatus } from '@/types/database'
import { Badge } from '@/components/ui/Badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'

const statusBadge: Record<AccountStatus, { label: string; variant: 'gold' | 'success' | 'danger' }> = {
  pending: { label: 'Pendente', variant: 'gold' },
  active: { label: 'Ativa', variant: 'success' },
  blocked: { label: 'Bloqueada', variant: 'danger' },
}

export default function CompanySelector() {
  const navigate = useNavigate()
  const { data: accounts, isLoading, isError, error } = useAdminAccounts()
  const { setActingAs } = useActingAsContext()

  function enter(account: AdminAccountRow) {
    setActingAs(account.id, account.business_name || account.name || account.email)
    navigate('/')
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Empresas</h1>
        <p className="mt-1 text-sm text-muted">Escolha uma conta para ver as informações dela.</p>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Não foi possível carregar as empresas: {error instanceof Error ? error.message : 'erro desconhecido'}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma conta cadastrada ainda." />
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((account) => {
            const badge = statusBadge[account.account_status]
            return (
              <button
                key={account.id}
                onClick={() => enter(account)}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-gold/50 hover:bg-surface-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                  {(account.business_name || account.name || account.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {account.business_name || account.name || account.email}
                  </p>
                  <p className="truncate text-xs text-muted">{account.email}</p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {account.role === 'admin' && <Badge variant="gold">Admin</Badge>}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
