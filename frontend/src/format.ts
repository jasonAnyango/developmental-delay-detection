export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string) {
  const time = new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${formatDate(iso)}, ${time}`
}

export function percent(value: number | null) {
  return value === null ? '-' : `${Math.round(value * 100)}%`
}

export function zText(value: number | null) {
  return value === null ? '-' : value.toFixed(2)
}