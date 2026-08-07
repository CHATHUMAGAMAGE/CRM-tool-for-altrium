import {
  ensureValidSession,
  refreshAccessToken,
} from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'CONVERTED'
  | 'LOST'

export type Lead = {
  id: number
  company_name: string
  contact_name: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  status_display: string

  qualification_notes: string
  lost_reason: string

  assigned_to: number | null
  assigned_to_name: string | null
  assigned_to_username: string | null

  created_by: number
  created_by_name: string
  created_by_username: string

  created_at: string
  updated_at: string
  converted_at: string | null
}

export type CreateLeadInput = {
  company_name: string
  contact_name: string
  email?: string
  phone: string
  source?: string
}

export type UpdateLeadInput = Partial<{
  company_name: string
  contact_name: string
  email: string
  phone: string
  source: string
  status: LeadStatus
  qualification_notes: string
  lost_reason: string
  assigned_to: number | null
}>

type PaginatedResponse<T> = {
  results: T[]
}

function isPaginatedResponse<T>(
  value: T[] | PaginatedResponse<T>,
): value is PaginatedResponse<T> {
  return (
    !Array.isArray(value) &&
    typeof value === 'object' &&
    value !== null &&
    'results' in value
  )
}

async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const data = (await response.json()) as Record<
      string,
      unknown
    >

    if (typeof data.detail === 'string') {
      return data.detail
    }

    for (const [field, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        return `${field}: ${String(value[0])}`
      }

      if (typeof value === 'string') {
        return `${field}: ${value}`
      }
    }
  } catch {
    // Fall through to the generic message.
  }

  return `Request failed with status ${response.status}.`
}

async function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const sessionIsValid = await ensureValidSession()

  if (!sessionIsValid) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }

  let accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }

  const headers = new Headers(options.headers)

  headers.set(
    'Authorization',
    `Bearer ${accessToken}`,
  )

  if (options.body && !headers.has('Content-Type')) {
    headers.set(
      'Content-Type',
      'application/json',
    )
  }

  let response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    },
  )

  if (response.status === 401) {
    accessToken = await refreshAccessToken()

    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )

    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
      },
    )
  }

  return response
}

export async function getLeads(): Promise<Lead[]> {
  const response = await authenticatedRequest(
    '/api/v1/crm/leads/',
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    )
  }

  const data = (await response.json()) as
    | Lead[]
    | PaginatedResponse<Lead>

  if (isPaginatedResponse(data)) {
    return data.results
  }

  return data
}

export async function getLead(
  leadId: number,
): Promise<Lead> {
  const response = await authenticatedRequest(
    `/api/v1/crm/leads/${leadId}/`,
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    )
  }

  return (await response.json()) as Lead
}

export async function createLead(
  lead: CreateLeadInput,
): Promise<Lead> {
  const response = await authenticatedRequest(
    '/api/v1/crm/leads/',
    {
      method: 'POST',
      body: JSON.stringify(lead),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    )
  }

  return (await response.json()) as Lead
}

export async function updateLead(
  leadId: number,
  updates: UpdateLeadInput,
): Promise<Lead> {
  const response = await authenticatedRequest(
    `/api/v1/crm/leads/${leadId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response),
    )
  }

  return (await response.json()) as Lead
}