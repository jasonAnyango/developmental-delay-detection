import { createContext } from 'react'
import type { LoginResponse } from '../api/api.ts'
import type { Session } from './session.ts'

export type AuthValue = {
  session: Session | null
  expired: boolean
  login: (response: LoginResponse) => void
  logout: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)