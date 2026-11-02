import { useEffect, useState } from 'react'
import { api, type Evaluation } from '../api/api.ts'
import { errorMessages } from '../api/client.ts'

export function useEvaluation() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    api
      .evaluation()
      .then((response) => active && setEvaluation(response))
      .catch((error) => active && setErrors(errorMessages(error)))
    return () => {
      active = false
    }
  }, [attempt])

  function retry() {
    setErrors([])
    setEvaluation(null)
    setAttempt((current) => current + 1)
  }

  return { evaluation, errors, retry }
}