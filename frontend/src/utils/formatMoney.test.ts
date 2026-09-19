import { describe, expect, it } from 'vitest'
import { formatMoney } from './formatMoney'

describe('formatMoney', () => {
  it('formats delivery cost and shortfall with the supplied currency', () => {
    expect(formatMoney('LKR', '4850000.00')).toBe('LKR 4,850,000')
    expect(formatMoney('LKR', '850000.00')).toBe('LKR 850,000')
  })
  it('renders unavailable historical values safely', () => {
    expect(formatMoney('LKR', null)).toBe('—')
  })
  it('never displays a negative monetary position', () => {
    expect(formatMoney('USD', '-25.00')).toBe('USD 0')
  })
})
