import { useEffect, useState } from 'react'
import { api } from '../api/api.ts'
import { useAuth } from '../auth/useAuth.ts'

type Connection = 'checking' | 'connected' | 'unavailable'

export default function Home() {
  const { session } = useAuth()
  const [connection, setConnection] = useState<Connection>('checking')

  useEffect(() => {
    let active = true
    api
      .databaseHealth()
      .then(() => active && setConnection('connected'))
      .catch(() => active && setConnection('unavailable'))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Welcome, {session?.doctor.full_name}</h1>
      <p className="text-slate-600">Screening support for developmental delay in children aged 0 to 3.</p>
      <p className="text-sm" data-testid="connection">
        Backend:{' '}
        {connection === 'checking' && 'checking...'}
        {connection === 'connected' && 'connected'}
        {connection === 'unavailable' && 'unavailable'}
      </p>
    </div>
  )
}