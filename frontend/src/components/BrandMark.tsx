type Props = {
  className?: string
  inverse?: boolean
}

export default function BrandMark({ className = 'h-8 w-8', inverse = false }: Props) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={inverse ? '#ffffff' : '#115c63'} />
      <path
        d="M7 23 C12 23 14 13 25 9"
        fill="none"
        stroke={inverse ? '#0d4a50' : '#ffffff'}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="25" cy="9" r="2.4" fill={inverse ? '#0d4a50' : '#ffffff'} />
    </svg>
  )
}