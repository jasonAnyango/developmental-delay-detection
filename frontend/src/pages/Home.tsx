import { useEffect, useState } from 'react'
import { api } from '../api/api.ts'
import { useAuth } from '../auth/useAuth.ts'

type Connection = 'checking' | 'connected' | 'unavailable'

export default function Home() {
  const { session, logout } = useAuth()
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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">SOPHIA</h1>
      <p className="text-slate-600">Screening support for developmental delay in children aged 0 to 3.</p>
      <p data-testid="doctor">Signed in as {session?.doctor.full_name}</p>
      <p className="text-sm" data-testid="connection">
        Backend:{' '}
        {connection === 'checking' && 'checking...'}
        {connection === 'connected' && 'connected'}
        {connection === 'unavailable' && 'unavailable'}
      </p>
      <button onClick={logout} className="w-fit text-blue-700 underline">
        Log out
      </button>
    </main>
  )
}