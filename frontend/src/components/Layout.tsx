import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/assess', label: 'New assessment' },
]

export default function Layout() {
  const { session, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-semibold">SOPHIA</span>
          <nav aria-label="Main" className="flex flex-1 gap-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'font-medium text-blue-700 underline' : 'text-slate-700 hover:text-blue-700'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span data-testid="doctor" className="text-slate-600">
              {session?.doctor.full_name}
            </span>
            <button onClick={logout} className="text-blue-700 underline">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <p data-testid="notice" className="mx-auto max-w-5xl px-4 py-3 text-xs text-slate-600">
          SOPHIA is a screening support tool and does not diagnose. A flag means a child may benefit from a full
          assessment by a qualified professional. Clinical judgement always comes first.
        </p>
      </footer>
    </div>
  )
}