import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ActingAsState {
  userId: string
  label: string
}

interface ActingAsContextValue {
  actingAs: ActingAsState | null
  setActingAs: (userId: string, label: string) => void
  clearActingAs: () => void
}

const ActingAsContext = createContext<ActingAsContextValue | null>(null)
export const ACTING_AS_STORAGE_KEY = 'barbearia:acting-as'

function readStored(): ActingAsState | null {
  try {
    const raw = sessionStorage.getItem(ACTING_AS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ActingAsState) : null
  } catch {
    return null
  }
}

export function ActingAsProvider({ children }: { children: ReactNode }) {
  const [actingAs, setActingAsState] = useState<ActingAsState | null>(readStored)

  useEffect(() => {
    try {
      if (actingAs) sessionStorage.setItem(ACTING_AS_STORAGE_KEY, JSON.stringify(actingAs))
      else sessionStorage.removeItem(ACTING_AS_STORAGE_KEY)
    } catch {
      // ignora — apenas uma conveniência, não é crítico persistir
    }
  }, [actingAs])

  function setActingAs(userId: string, label: string) {
    setActingAsState({ userId, label })
  }

  function clearActingAs() {
    setActingAsState(null)
  }

  return (
    <ActingAsContext.Provider value={{ actingAs, setActingAs, clearActingAs }}>{children}</ActingAsContext.Provider>
  )
}

export function useActingAsContext() {
  const ctx = useContext(ActingAsContext)
  if (!ctx) throw new Error('useActingAsContext must be used within ActingAsProvider')
  return ctx
}
