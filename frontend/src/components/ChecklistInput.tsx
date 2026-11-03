import type { Checklist } from '../api/api.ts'
import { DOMAIN_LABELS } from '../domains.ts'
import { MIN_ITEMS_TO_SCORE } from '../validation.ts'

const OPTIONS = [
  {
    value: 'passed',
    label: 'Passed',
    style: 'peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white',
  },
  {
    value: 'failed',
    label: 'Not passed',
    style: 'peer-checked:border-amber-700 peer-checked:bg-amber-700 peer-checked:text-white',
  },
  {
    value: 'none',
    label: 'Not tried',
    style: 'peer-checked:border-slate-300 peer-checked:bg-slate-200 peer-checked:text-slate-900',
  },
] as const

type Props = {
  checklist: Checklist
  answers: Record<string, boolean>
  onAnswer: (id: string, value: boolean | null) => void
}

function current(answer: boolean | undefined) {
  if (answer === undefined) return 'none'
  return answer ? 'passed' : 'failed'
}

export default function ChecklistInput({ checklist, answers, onAnswer }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {checklist.domains.map(({ domain, items }, index) => {
        const tried = items.filter((item) => item.id in answers)
        const passed = tried.filter((item) => answers[item.id]).length
        return (
          <details
            key={domain}
            open={index === 0}
            className="group panel overflow-hidden"
            data-testid={`checklist-${domain}`}
          >
            <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
              <span className="flex items-center gap-2 font-medium text-brand-800">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {DOMAIN_LABELS[domain]}
              </span>
              <span className="text-sm text-slate-600" data-testid={`tally-${domain}`}>
                {passed} passed of {tried.length} tried ({items.length} items)
              </span>
            </summary>
            {tried.length > 0 && tried.length < MIN_ITEMS_TO_SCORE && (
              <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Try at least {MIN_ITEMS_TO_SCORE} items for this domain to be scored.
              </p>
            )}
            <ul className="border-t border-slate-100">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span id={`label-${item.id}`} className="text-sm">
                    {item.label}
                  </span>
                  <div role="radiogroup" aria-labelledby={`label-${item.id}`} className="flex shrink-0 gap-1.5">
                    {OPTIONS.map((option) => (
                      <label key={option.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name={item.id}
                          value={option.value}
                          checked={current(answers[item.id]) === option.value}
                          onChange={() => onAnswer(item.id, option.value === 'none' ? null : option.value === 'passed')}
                          className="peer sr-only"
                        />
                        <span
                          className={`block whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm text-slate-700 hover:border-brand-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 ${option.style}`}
                        >
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}