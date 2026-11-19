import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api.ts'
import { errorMessages } from '../api/client.ts'

type Props = { id: number; childRef: string; assessmentCount: number }

export default function DeleteChild({ id, childRef, assessmentCount }: Props) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  async function remove() {
    setBusy(true)
    setErrors([])
    try {
      await api.deleteChild(id)
      navigate('/children')
    } catch (error) {
      setErrors(errorMessages(error))
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="btn-danger-outline w-fit" data-testid="delete-start">
        Delete this child
      </button>
    )
  }

  return (
    <div role="group" aria-labelledby="delete-title" className="flex max-w-xl flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
      <h2 id="delete-title" className="text-base font-semibold text-red-900">
        Delete Child {childRef}?
      </h2>
      <p className="text-sm text-red-900">
        This permanently removes the child and {assessmentCount} {assessmentCount === 1 ? 'assessment' : 'assessments'}{' '}
        from your records. It cannot be undone.
      </p>
      {errors.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-sm text-red-900">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <button onClick={remove} disabled={busy} className="btn-danger" data-testid="delete-confirm">
          {busy ? 'Deleting...' : 'Delete permanently'}
        </button>
        <button onClick={() => setConfirming(false)} disabled={busy} className="btn-secondary" autoFocus>
          Cancel
        </button>
      </div>
    </div>
  )
}
