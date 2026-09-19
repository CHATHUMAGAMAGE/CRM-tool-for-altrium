export function formatMoney(currency: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.max(0, amount))
  return currency ? `${currency} ${formatted}` : formatted
}
