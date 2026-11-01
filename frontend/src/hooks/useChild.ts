import { useEffect, useState } from 'react'
import { api, type ChildHistory } from '../api/api.ts'
import { ApiError, errorMessages } from '../api/client.ts'

export function useChild(id: number) {
  const [child, setChild] = useState<ChildHistory | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [notFound, setNotFound] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    api
      .child(id)
      .then((response) => active && setChild(response))
      .catch((error) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 404) setNotFound(true)
        else setErrors(errorMessages(error))
      })
    return () => {
      active = false
    }
  }, [id, attempt])

  function retry() {
    setErrors([])
    setChild(null)
    setAttempt((current) => current + 1)
  }

  return { child, errors, notFound, retry }
}