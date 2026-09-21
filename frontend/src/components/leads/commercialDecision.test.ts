import { describe, expect, it } from 'vitest'
import { getApprovedCommercialNextStep } from './commercialDecision'

describe('approved commercial exception next step', () => {
  it('requests Technical Assessment when none exists', () => {
    expect(getApprovedCommercialNextStep({})).toEqual({ label: 'Request Technical Assessment', action: 'REQUEST_TECHNICAL' })
  })

  it('tracks active and submitted Technical Assessment states', () => {
    expect(getApprovedCommercialNextStep({ technicalStatus: 'IN_PROGRESS' }).label).toBe('Awaiting Technical Assessment')
    expect(getApprovedCommercialNextStep({ technicalStatus: 'SUBMITTED' }).action).toBe('REVIEW_TECHNICAL')
    expect(getApprovedCommercialNextStep({ technicalStatus: 'REVIEWED' }).action).toBe('OPPORTUNITY_DECISION')
  })

  it('moves a Proceed decision to Deal conversion without changing Finance', () => {
    expect(getApprovedCommercialNextStep({ technicalStatus: 'REVIEWED', decision: 'PROCEED' })).toEqual({ label: 'Ready to Convert to Deal', action: 'CONVERT_DEAL' })
  })
})
