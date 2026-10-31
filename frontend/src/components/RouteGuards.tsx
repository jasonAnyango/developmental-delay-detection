import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

export function ProtectedRoute() {
  const { session } = useAuth()
  const location = useLocation()
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export function GuestRoute() {
  const { session } = useAuth()
  const location = useLocation()
  if (session) {
    return <Navigate to={location.state?.from ?? '/'} replace />
  }
  return <Outlet />
}