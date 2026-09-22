import { describe, expect, it } from 'vitest'

import {
  activeLeadStatuses,
  selectableLeadStatuses,
} from './leadStatusOptions'


describe('lead lifecycle status options', () => {
  it('exposes only the modern active lifecycle', () => {
    expect(activeLeadStatuses).toEqual([
      'NEW',
      'CONTACTED',
      'PROPOSAL',
    ])
  })

  it('does not expose legacy lifecycle values as selectable options', () => {
    expect(selectableLeadStatuses).not.toContain('QUALIFIED')
    expect(selectableLeadStatuses).not.toContain(
      'SUBMITTED_FOR_QUALIFICATION',
    )
  })
})
