type Props = {
  errors: string[]
  onRetry: () => void
}

export default function LoadError({ errors, onRetry }: Props) {
  return (
    <div role="alert" className="flex max-w-xl flex-col gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">
      {errors.map((message) => (
        <p key={message}>{message}</p>
      ))}
      <button onClick={onRetry} className="link w-fit">
        Try again
      </button>
    </div>
  )
}