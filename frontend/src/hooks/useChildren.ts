import { useEffect, useState } from 'react'
import { api, type ChildSummary } from '../api/api.ts'
import { errorMessages } from '../api/client.ts'

export function useChildren() {
  const [children, setChildren] = useState<ChildSummary[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    api
      .children()
      .then((response) => active && setChildren(response.children))
      .catch((error) => active && setErrors(errorMessages(error)))
    return () => {
      active = false
    }
  }, [attempt])

  function retry() {
    setErrors([])
    setChildren(null)
    setAttempt((current) => current + 1)
  }

  return { children, errors, retry }
}