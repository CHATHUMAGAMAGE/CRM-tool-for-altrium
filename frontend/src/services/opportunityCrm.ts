import {
  ensureValidSession,
  getAccessToken,
  refreshAccessToken,
} from './auth'

import type {
  Lead,
  LeadStatus,
} from './crm'


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL


export type OpportunityDecision =
  | 'APPROVED'
  | 'REJECTED'


export type DealStatus =
  | 'OPEN'
  | 'WON'
  | 'LOST'


export type LeadOpportunityDecision = {
  id: number

  lead: number
  lead_company_name: string
  lead_contact_name: string

  lead_status: LeadStatus
  lead_status_display: string

  technical_assessment: number
  technical_assessment_status: string
  technical_assessment_status_display: string

  financial_assessment: number
  financial_assessment_status: string
  financial_assessment_status_display: string

  decision:
    OpportunityDecision

  decision_display: string

  decision_notes: string

  decided_by: number
  decided_by_name: string
  decided_by_username: string

  decided_at: string
  created_at: string
  updated_at: string
}


export type Deal = {
  id: number

  source_lead: number
  source_lead_company: string
  source_lead_contact: string

  source_lead_status: LeadStatus
  source_lead_status_display: string

  opportunity_decision: number

  approval_decision:
    OpportunityDecision

  approval_decision_display: string

  decision_notes: string
  decided_by_name: string

  name: string

  company_name: string
  contact_name: string

  email: string
  phone: string

  status:
    DealStatus

  status_display: string

  assigned_to: number | null
  assigned_to_name: string | null
  assigned_to_username: string | null

  created_by: number
  created_by_name: string
  created_by_username: string

  created_at: string
  updated_at: string
}


export type OpportunityDecisionState = {
  decision:
    LeadOpportunityDecision | null

  can_convert:
    boolean

  deal:
    Deal | null
}


export type CreateOpportunityDecisionInput = {
  decision:
    OpportunityDecision

  decision_notes:
    string
}


export type ConvertLeadToDealResponse = {
  lead:
    Lead

  opportunity_decision:
    LeadOpportunityDecision

  deal:
    Deal
}


async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const data =
      (
        await response.json()
      ) as Record<
        string,
        unknown
      >

    if (
      typeof data.detail ===
      'string'
    ) {
      return data.detail
    }

    if (
      Array.isArray(
        data.detail,
      ) &&
      data.detail.length >
        0
    ) {
      return String(
        data.detail[
          0
        ],
      )
    }

    for (
      const [
        field,
        value,
      ]
      of Object.entries(
        data,
      )
    ) {
      if (
        Array.isArray(
          value,
        ) &&
        value.length >
          0
      ) {
        return `${field}: ${String(
          value[
            0
          ],
        )}`
      }

      if (
        typeof value ===
        'string'
      ) {
        return `${field}: ${value}`
      }
    }
  } catch {
    // Use generic fallback below.
  }

  return (
    `Request failed with status `
    + `${response.status}.`
  )
}


async function authenticatedRequest(
  path: string,
  options:
    RequestInit = {},
): Promise<Response> {
  const sessionIsValid =
    await ensureValidSession()

  if (
    !sessionIsValid
  ) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }

  let accessToken =
    getAccessToken()

  if (
    !accessToken
  ) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }

  const headers =
    new Headers(
      options.headers,
    )

  headers.set(
    'Authorization',
    `Bearer ${accessToken}`,
  )

  if (
    options.body &&
    !headers.has(
      'Content-Type',
    )
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    )
  }

  let response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
      },
    )

  if (
    response.status ===
    401
  ) {
    accessToken =
      await refreshAccessToken()

    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )

    response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...options,
          headers,
        },
      )
  }

  return response
}


export async function getLeadOpportunityDecision(
  leadId: number,
): Promise<OpportunityDecisionState> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/opportunity-decision/`,
    )

  if (
    !response.ok
  ) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as OpportunityDecisionState
}


export async function createLeadOpportunityDecision(
  leadId: number,
  input:
    CreateOpportunityDecisionInput,
): Promise<LeadOpportunityDecision> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/opportunity-decision/`,
      {
        method:
          'POST',

        body:
          JSON.stringify(
            input,
          ),
      },
    )

  if (
    !response.ok
  ) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as LeadOpportunityDecision
}


export async function convertLeadToDeal(
  leadId: number,
): Promise<ConvertLeadToDealResponse> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/convert/`,
      {
        method:
          'POST',
      },
    )

  if (
    !response.ok
  ) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as ConvertLeadToDealResponse
}