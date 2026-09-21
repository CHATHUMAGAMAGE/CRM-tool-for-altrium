export type CommercialNextStep = {
  label: string
  action: 'REQUEST_TECHNICAL' | 'REVIEW_TECHNICAL' | 'OPPORTUNITY_DECISION' | 'CONVERT_DEAL' | null
}

export function getApprovedCommercialNextStep(input: {
  technicalStatus?: string | null
  decision?: 'PROCEED' | 'DO_NOT_PROCEED' | null
  hasDeal?: boolean
}): CommercialNextStep {
  if (input.hasDeal) return { label: 'Deal created', action: null }
  if (input.decision === 'DO_NOT_PROCEED') return { label: 'Opportunity closed — Do Not Proceed', action: null }
  if (input.decision === 'PROCEED') return { label: 'Ready to Convert to Deal', action: 'CONVERT_DEAL' }
  if (!input.technicalStatus) return { label: 'Request Technical Assessment', action: 'REQUEST_TECHNICAL' }
  if (input.technicalStatus === 'REQUESTED' || input.technicalStatus === 'IN_PROGRESS') {
    return { label: 'Awaiting Technical Assessment', action: null }
  }
  if (input.technicalStatus === 'SUBMITTED') return { label: 'Review Technical Assessment', action: 'REVIEW_TECHNICAL' }
  return { label: 'Ready for Opportunity Decision', action: 'OPPORTUNITY_DECISION' }
}
