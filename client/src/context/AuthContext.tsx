import { createContext, useContext, useEffect, useState } from 'react'
import { tokenStore } from '../api/tokenStore'
import { login as apiLogin, logout as apiLogout, refresh } from '../api/auth'
import type { User } from '../types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('crm_user')
    if (!stored) { setLoading(false); return }
    refresh()
      .then(token => {
        tokenStore.set(token)
        setUser(JSON.parse(stored) as User)
      })
      .catch(() => localStorage.removeItem('crm_user'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password)
    tokenStore.set(result.accessToken)
    localStorage.setItem('crm_user', JSON.stringify(result.user))
    setUser(result.user)
  }

  async function logout() {
    await apiLogout()
    tokenStore.clear()
    localStorage.removeItem('crm_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
