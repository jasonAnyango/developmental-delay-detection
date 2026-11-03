import { Link } from 'react-router-dom'
import BrandMark from '../components/BrandMark.tsx'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <BrandMark className="h-10 w-10" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-slate-600">The page you asked for does not exist, or it has moved.</p>
      <Link to="/" className="btn-primary w-fit">
        Back to the start
      </Link>
    </main>
  )
}