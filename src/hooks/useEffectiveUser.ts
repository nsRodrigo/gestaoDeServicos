import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useActingAsContext } from '@/hooks/useActingAs'

/**
 * The account whose data should actually be read/written.
 * For a regular user this is always their own id. For an admin who has
 * entered a company via the /empresas picker, it's that company's id instead.
 */
export function useEffectiveUser() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const { actingAs } = useActingAsContext()
  const isAdmin = profile?.role === 'admin'
  const targetUserId = isAdmin && actingAs ? actingAs.userId : (user?.id ?? null)

  return {
    /** id to scope every query/write to */
    targetUserId,
    /** only truthy for an admin who is viewing another account's data */
    actingAs: isAdmin ? actingAs : null,
    isAdmin,
  }
}
