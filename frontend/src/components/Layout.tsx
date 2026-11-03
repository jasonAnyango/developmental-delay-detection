import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import BrandMark from './BrandMark.tsx'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/children', label: 'Children' },
  { to: '/assess', label: 'New assessment' },
  { to: '/model', label: 'Model report' },
]

export default function Layout() {
  const { session, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="SOPHIA home">
            <BrandMark />
            <span className="text-lg font-bold tracking-tight text-brand-900">SOPHIA</span>
          </Link>
          <nav
            aria-label="Main"
            className="order-last flex w-full flex-wrap gap-x-5 gap-y-1 text-sm sm:order-none sm:w-auto sm:flex-1"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 py-1 font-medium ${
                    isActive
                      ? 'border-brand-700 text-brand-800'
                      : 'border-transparent text-slate-600 hover:text-brand-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span data-testid="doctor" className="text-slate-600">
              {session?.doctor.full_name}
            </span>
            <button onClick={logout} className="btn-secondary px-3 py-1 text-sm">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-3 text-sm text-slate-600">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true">
            <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="10" cy="6.2" r="1" fill="currentColor" />
          </svg>
          <p data-testid="notice">
            SOPHIA is a screening support tool and does not diagnose. A flag means a child may benefit from a full
            assessment by a qualified professional. Clinical judgement always comes first.
          </p>
        </div>
      </footer>
    </div>
  )
}