import { useEffect, useRef } from 'react'
import { matchPath, useLocation } from 'react-router-dom'

const TITLES: [string, string][] = [
  ['/', 'Dashboard'],
  ['/children', 'Children'],
  ['/children/:id', 'Child'],
  ['/assess', 'New assessment'],
  ['/assess/result', 'Assessment result'],
  ['/model', 'Model report'],
  ['/login', 'Sign in'],
  ['/register', 'Create account'],
]

function titleFor(pathname: string) {
  const match = TITLES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname))
  return match ? `${match[1]} - SOPHIA` : 'Page not found - SOPHIA'
}

export default function RouteEffects() {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    document.title = titleFor(pathname)
    if (first.current) {
      first.current = false
      return
    }
    const target = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main')
    if (target) {
      target.tabIndex = -1
      target.focus({ preventScroll: true })
    }
  }, [pathname])

  return null
}