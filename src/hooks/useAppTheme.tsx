import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react'
import { useProfile } from '@/hooks/useProfile'
import type { AppTheme } from '@/types/database'

const ThemeContext = createContext<AppTheme>('dark')

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile()
  const theme = profile?.theme ?? 'dark'

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  return useContext(ThemeContext)
}
