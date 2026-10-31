import type { Doctor } from '../api/api.ts'

const KEY = 'sophia.session'

export type Session = { token: string; doctor: Doctor; expiresAt: number }

export function loadSession(): { session: Session | null; expired: boolean } {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { session: null, expired: false }
    const stored = JSON.parse(raw) as Session
    const valid = typeof stored.token === 'string' && typeof stored.expiresAt === 'number' && stored.doctor
    if (!valid) {
      clearSession()
      return { session: null, expired: false }
    }
    if (stored.expiresAt <= Date.now()) {
      clearSession()
      return { session: null, expired: true }
    }
    return { session: stored, expired: false }
  } catch {
    return { session: null, expired: false }
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // storage unavailable: the session lasts until the page is closed
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}