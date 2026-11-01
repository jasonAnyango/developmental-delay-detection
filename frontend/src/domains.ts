export type DomainName = 'cognitive' | 'motor' | 'language' | 'social_emotional'

export const DOMAINS: { key: DomainName; label: string }[] = [
  { key: 'cognitive', label: 'Cognitive' },
  { key: 'motor', label: 'Motor' },
  { key: 'language', label: 'Language' },
  { key: 'social_emotional', label: 'Social-emotional' },
]