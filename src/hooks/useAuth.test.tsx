import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './useAuth'

const signInWithPassword = vi.fn()
const signUp = vi.fn()
const getSession = vi.fn()
const onAuthStateChange = vi.fn()
const setRememberMe = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signUp: (...args: unknown[]) => signUp(...args),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: (...args: unknown[]) => getSession(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChange(...args),
    },
  },
  setRememberMe: (...args: unknown[]) => setRememberMe(...args),
}))

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: null } })
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('useAuth signIn', () => {
  it('normalizes the email (trim + lowercase) before calling Supabase', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    const { result } = renderAuth()
    await waitFor(() => expect(getSession).toHaveBeenCalled())

    await result.current.signIn('  Foo@Bar.COM  ', 'secret')

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'foo@bar.com', password: 'secret' })
  })

  it('maps invalid credentials to a friendly message', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { result } = renderAuth()
    await waitFor(() => expect(getSession).toHaveBeenCalled())

    const { error } = await result.current.signIn('user@example.com', 'wrong')

    expect(error).toBe('E-mail ou senha incorretos.')
  })

  it('maps an unconfirmed email to a message that explains the real cause', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Email not confirmed' } })
    const { result } = renderAuth()
    await waitFor(() => expect(getSession).toHaveBeenCalled())

    const { error } = await result.current.signIn('user@example.com', 'secret')

    expect(error).toMatch(/não confirmado/i)
  })
})

describe('useAuth signUp', () => {
  it('normalizes the email before calling Supabase', async () => {
    signUp.mockResolvedValue({ error: null })
    const { result } = renderAuth()
    await waitFor(() => expect(getSession).toHaveBeenCalled())

    await result.current.signUp('  Foo@Bar.COM  ', 'secret', 'Fulano')

    expect(signUp).toHaveBeenCalledWith({
      email: 'foo@bar.com',
      password: 'secret',
      options: { data: { name: 'Fulano' } },
    })
  })

  it('maps an already-registered email to a friendly message', async () => {
    signUp.mockResolvedValue({ error: { message: 'User already registered' } })
    const { result } = renderAuth()
    await waitFor(() => expect(getSession).toHaveBeenCalled())

    const { error } = await result.current.signUp('user@example.com', 'secret', 'Fulano')

    expect(error).toBe('Já existe uma conta com esse e-mail.')
  })
})
