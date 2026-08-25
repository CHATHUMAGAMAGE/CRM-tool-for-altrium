import {
  ensureValidSession,
  getAccessToken,
  refreshAccessToken,
} from './auth'

import type {
  LeadStatus,
} from './crm'


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL


export type FinancialAssessmentStatus =
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWED'


export type FinancialAssessmentHistoryEventType =
  | 'REQUESTED'
  | 'STARTED'
  | 'UPDATED'
  | 'DOCUMENT_ADDED'
  | 'SUBMITTED'
  | 'REVIEWED'


export type FinancialOfficer = {
  id: number
  username: string
  full_name: string
  role: 'FINANCIAL_OFFICER'
  role_display: string
}


export type FinancialAssessmentDocument = {
  id: number
  assessment: number

  title: string
  description: string

  file: string

  uploaded_by: number
  uploaded_by_name: string

  uploaded_at: string
}


export type FinancialAssessmentHistory = {
  id: number
  assessment: number

  event_type:
    FinancialAssessmentHistoryEventType

  event_type_display: string

  description: string

  performed_by: number | null
  performed_by_name: string | null

  metadata:
    Record<string, unknown>

  created_at: string
}


export type FinancialAssessment = {
  id: number

  lead: number
  lead_company_name: string
  lead_contact_name: string
  lead_status: LeadStatus
  lead_status_display: string

  technical_assessment: number

  technical_assessment_status: string
  technical_assessment_status_display: string

  technical_comments: string
  technical_review_notes: string

  requested_by: number
  requested_by_name: string

  assigned_to: number
  assigned_to_name: string
  assigned_to_username: string

  requirements: string

  status:
    FinancialAssessmentStatus

  status_display: string

  financial_comments: string

  submitted_at: string | null

  reviewed_at: string | null
  reviewed_by: number | null
  reviewed_by_name: string | null

  review_notes: string

  created_at: string
  updated_at: string

  documents:
    FinancialAssessmentDocument[]

  history:
    FinancialAssessmentHistory[]
}


export type CreateFinancialAssessmentInput = {
  lead: number

  technical_assessment: number

  assigned_to: number

  requirements: string
}


export type UpdateFinancialAssessmentRequestInput =
  Partial<{
    assigned_to: number

    requirements: string
  }>


export type UpdateFinancialAssessmentWorkInput = {
  financial_comments: string
}


export type ReviewFinancialAssessmentInput = {
  review_notes: string
}


export type UploadFinancialAssessmentDocumentInput = {
  title: string

  description?: string

  file: File
}


type PaginatedResponse<T> = {
  results: T[]
}


function isPaginatedResponse<T>(
  value:
    T[] |
    PaginatedResponse<T>,
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
    const data =
      (await response.json()) as Record<
        string,
        unknown
      >

    if (
      typeof data.detail ===
      'string'
    ) {
      return data.detail
    }

    for (
      const [
        field,
        value,
      ]
      of Object.entries(data)
    ) {
      if (
        Array.isArray(value) &&
        value.length > 0
      ) {
        return `${field}: ${String(
          value[0],
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
    // Use the generic fallback below.
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

  if (!sessionIsValid) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }

  let accessToken =
    getAccessToken()

  if (!accessToken) {
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

  const bodyIsFormData =
    options.body instanceof FormData

  if (
    options.body &&
    !bodyIsFormData &&
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


/*
 * FINANCIAL ASSESSMENTS
 */

export async function getFinancialAssessments():
Promise<FinancialAssessment[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/financial-assessments/',
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  const data =
    (await response.json()) as
      | FinancialAssessment[]
      | PaginatedResponse<FinancialAssessment>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getFinancialAssessment(
  assessmentId: number,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/`,
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as FinancialAssessment
}


export async function getFinancialOfficers():
Promise<FinancialOfficer[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/financial-assessments/officers/',
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as FinancialOfficer[]
}


export async function createFinancialAssessment(
  input:
    CreateFinancialAssessmentInput,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/financial-assessments/',
      {
        method:
          'POST',

        body:
          JSON.stringify(
            input,
          ),
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  const created =
    (await response.json()) as {
      id: number
    }

  return getFinancialAssessment(
    created.id,
  )
}


export async function updateFinancialAssessmentRequest(
  assessmentId: number,
  input:
    UpdateFinancialAssessmentRequestInput,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/request/`,
      {
        method:
          'PATCH',

        body:
          JSON.stringify(
            input,
          ),
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return getFinancialAssessment(
    assessmentId,
  )
}


export async function startFinancialAssessment(
  assessmentId: number,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/start/`,
      {
        method:
          'POST',
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as FinancialAssessment
}


export async function updateFinancialAssessmentWork(
  assessmentId: number,
  input:
    UpdateFinancialAssessmentWorkInput,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/work/`,
      {
        method:
          'PATCH',

        body:
          JSON.stringify(
            input,
          ),
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return getFinancialAssessment(
    assessmentId,
  )
}


export async function submitFinancialAssessment(
  assessmentId: number,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/submit/`,
      {
        method:
          'POST',
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as FinancialAssessment
}


export async function reviewFinancialAssessment(
  assessmentId: number,
  input:
    ReviewFinancialAssessmentInput,
): Promise<FinancialAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/review/`,
      {
        method:
          'POST',

        body:
          JSON.stringify(
            input,
          ),
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as FinancialAssessment
}


export async function getFinancialAssessmentHistory(
  assessmentId: number,
): Promise<FinancialAssessmentHistory[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/history/`,
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  const data =
    (await response.json()) as
      | FinancialAssessmentHistory[]
      | PaginatedResponse<FinancialAssessmentHistory>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getFinancialAssessmentDocuments(
  assessmentId: number,
): Promise<FinancialAssessmentDocument[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/documents/`,
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  const data =
    (await response.json()) as
      | FinancialAssessmentDocument[]
      | PaginatedResponse<FinancialAssessmentDocument>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function uploadFinancialAssessmentDocument(
  assessmentId: number,
  input:
    UploadFinancialAssessmentDocumentInput,
): Promise<FinancialAssessmentDocument> {
  const formData =
    new FormData()

  formData.append(
    'title',
    input.title,
  )

  formData.append(
    'description',
    input.description ?? '',
  )

  formData.append(
    'file',
    input.file,
  )

  const response =
    await authenticatedRequest(
      `/api/v1/crm/financial-assessments/${assessmentId}/documents/`,
      {
        method:
          'POST',

        body:
          formData,
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return (
    await response.json()
  ) as FinancialAssessmentDocument
}


export async function openFinancialAssessmentDocument(
  assessmentId: number,
  documentId: number,
): Promise<void> {
  const response = await authenticatedRequest(
    `/api/v1/crm/financial-assessments/${assessmentId}/documents/${documentId}/download/`,
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  window.open(objectUrl, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}
