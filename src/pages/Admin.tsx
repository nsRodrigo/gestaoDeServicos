import { ShieldCheck, Clock, Ban, Check, AlertTriangle } from 'lucide-react'
import { useAdminAccounts, useAdminAccountMutations } from '@/hooks/useAdmin'
import { useAuth } from '@/hooks/useAuth'
import type { AdminAccountRow, AccountStatus } from '@/types/database'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { formatDateBR } from '@/lib/format'

const statusBadge: Record<AccountStatus, { label: string; variant: 'gold' | 'success' | 'danger' }> = {
  pending: { label: 'Pendente', variant: 'gold' },
  active: { label: 'Ativa', variant: 'success' },
  blocked: { label: 'Bloqueada', variant: 'danger' },
}

export default function Admin() {
  const { user } = useAuth()
  const { data: accounts, isLoading, isError, error } = useAdminAccounts()
  const { setStatus } = useAdminAccountMutations()
  const toast = useToast()

  const pendingCount = accounts?.filter((a) => a.account_status === 'pending').length ?? 0

  async function changeStatus(account: AdminAccountRow, status: AccountStatus) {
    try {
      await setStatus.mutateAsync({ userId: account.id, status })
      const messages: Record<AccountStatus, string> = {
        active: 'Conta aprovada.',
        blocked: 'Conta bloqueada.',
        pending: 'Conta marcada como pendente.',
      }
      toast.success(messages[status])
    } catch {
      toast.error('Não foi possível atualizar a conta.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Contas</h1>
        {pendingCount > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gold">
            <Clock className="h-4 w-4" /> {pendingCount} conta(s) aguardando aprovação
          </p>
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Não foi possível carregar as contas: {error instanceof Error ? error.message : 'erro desconhecido'}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhuma conta cadastrada." />
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => {
            const isSelf = account.id === user?.id
            const badge = statusBadge[account.account_status]
            return (
              <div key={account.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {account.business_name || account.name || account.email}
                      {account.role === 'admin' && (
                        <span className="ml-2 inline-flex"><Badge variant="gold">Administrador</Badge></span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">{account.email}</p>
                    <p className="mt-0.5 text-xs text-muted">Criada em {formatDateBR(account.created_at.slice(0, 10))}</p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                {!isSelf && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    {account.account_status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => changeStatus(account, 'active')} loading={setStatus.isPending}>
                          <Check className="h-4 w-4" /> Aprovar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => changeStatus(account, 'blocked')}>
                          <Ban className="h-4 w-4" /> Recusar
                        </Button>
                      </>
                    )}
                    {account.account_status === 'active' && (
                      <Button size="sm" variant="danger" onClick={() => changeStatus(account, 'blocked')}>
                        <Ban className="h-4 w-4" /> Bloquear
                      </Button>
                    )}
                    {account.account_status === 'blocked' && (
                      <Button size="sm" variant="secondary" onClick={() => changeStatus(account, 'active')}>
                        <Check className="h-4 w-4" /> Liberar acesso
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
