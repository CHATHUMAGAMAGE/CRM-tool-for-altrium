import { describe, expect, it } from 'vitest'

import { EXECUTIVE_PRIMARY_NAVIGATION, hasRequiredRole, USER_ROLE_LABELS } from './roles'

describe('Executive role', () => {
  it('uses the expected user-facing label', () => {
    expect(USER_ROLE_LABELS.EXECUTIVE).toBe('Executive')
  })

  it('is accepted only by routes that explicitly include it', () => {
    expect(hasRequiredRole('EXECUTIVE', ['EXECUTIVE', 'DIRECTOR'])).toBe(true)
    expect(hasRequiredRole('EXECUTIVE', ['ADMIN'])).toBe(false)
    expect(hasRequiredRole('EXECUTIVE', ['FINANCIAL_OFFICER'])).toBe(false)
  })

  it('uses management navigation without operational follow-up or activity queues', () => {
    expect(EXECUTIVE_PRIMARY_NAVIGATION).toEqual([
      'Dashboard',
      'Pipeline',
      'Reports & Analytics',
      'Approvals',
    ])
  })
})
