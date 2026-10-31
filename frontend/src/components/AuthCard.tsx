import type { ReactNode } from 'react'

type Props = {
  title: string
  notice?: string
  errors: string[]
  children: ReactNode
}

export default function AuthCard({ title, notice, errors, children }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {notice && (
        <p role="status" className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
          {notice}
        </p>
      )}
      {errors.length > 0 && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {children}
    </main>
  )
}