import type { LeadStatus } from '../services/crm'


export const activeLeadStatuses: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'PROPOSAL',
]


export const closedLeadStatuses: LeadStatus[] = [
  'WON',
  'LOST',
  'DISQUALIFIED',
]


export const selectableLeadStatuses: LeadStatus[] = [
  ...activeLeadStatuses,
  ...closedLeadStatuses,
]
