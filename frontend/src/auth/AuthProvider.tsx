import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { LoginResponse } from '../api/api.ts'
import { setAuthToken, setUnauthorizedHandler } from '../api/client.ts'
import { AuthContext } from './AuthContext.ts'
import { clearSession, loadSession, saveSession } from './session.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const loaded = loadSession()
    setAuthToken(loaded.session?.token ?? null)
    return loaded
  })
  const [session, setSession] = useState(initial.session)
  const [expired, setExpired] = useState(initial.expired)

  const endSession = useCallback((wasExpired: boolean) => {
    clearSession()
    setAuthToken(null)
    setSession(null)
    setExpired(wasExpired)
  }, [])

  const login = useCallback((response: LoginResponse) => {
    const next = {
      token: response.token,
      doctor: response.doctor,
      expiresAt: Date.now() + response.expires_in * 1000,
    }
    saveSession(next)
    setAuthToken(next.token)
    setSession(next)
    setExpired(false)
  }, [])

  const logout = useCallback(() => endSession(false), [endSession])

  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  useEffect(() => {
    if (!session) return
    const wait = Math.max(session.expiresAt - Date.now(), 0)
    const timer = setTimeout(() => endSession(true), wait)
    return () => clearTimeout(timer)
  }, [session, endSession])

  return <AuthContext.Provider value={{ session, expired, login, logout }}>{children}</AuthContext.Provider>
}