import {
  ensureValidSession,
  refreshAccessToken,
} from './auth'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL


export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST'
  | 'DISQUALIFIED'


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


export type SalesRepresentative = {
  id: number
  username: string
  first_name: string
  last_name: string
  full_name: string
  role: 'SALES_REP'
}


/*
 * LEAD HISTORY
 */

export type LeadHistoryEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'STATUS_CHANGED'
  | 'QUALIFIED'
  | 'DISQUALIFIED'
  | 'WON'
  | 'LOST'


export type LeadHistory = {
  id: number
  lead: number

  event_type:
    LeadHistoryEventType

  event_type_display: string

  description: string

  performed_by: number | null
  performed_by_name: string | null
  performed_by_username: string | null

  metadata:
    Record<string, unknown>

  created_at: string
}


/*
 * LEAD RESCUE RADAR
 */

export type RescueRadarRiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CLOSED'


export type LeadRescueRadarAnalysis = {
  analysis_available: boolean

  health_score:
    number | null

  risk_level:
    RescueRadarRiskLevel

  confidence: number

  reasons: string[]

  recommended_action: string

  summary: string

  generated_at: string

  model: string | null
}


/*
 * COMMUNICATIONS
 */

export type CommunicationType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'WHATSAPP'


export type Communication = {
  id: number
  lead: number

  communication_type:
    CommunicationType

  communication_type_display:
    string

  communication_date: string

  summary: string
  notes: string

  created_by: number
  created_by_name: string
  created_by_username: string

  created_at: string
}


export type CreateCommunicationInput = {
  communication_type:
    CommunicationType

  communication_date: string

  summary: string

  notes?: string
}


/*
 * FOLLOW-UPS
 */

export type FollowUpStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'


export type FollowUp = {
  id: number
  lead: number

  title: string
  description: string

  due_date: string

  assigned_to: number | null
  assigned_to_name: string | null
  assigned_to_username: string | null

  status: FollowUpStatus
  status_display: string

  is_overdue: boolean

  completed_at: string | null

  completed_by: number | null
  completed_by_name: string | null
  completed_by_username: string | null

  created_by: number
  created_by_name: string
  created_by_username: string

  created_at: string
  updated_at: string
}


export type CreateFollowUpInput = {
  title: string

  description?: string

  due_date: string

  assigned_to?: number | null
}


export type UpdateFollowUpInput = Partial<{
  title: string

  description: string

  due_date: string

  assigned_to: number | null

  status: FollowUpStatus
}>


/*
 * TECHNICAL ASSESSMENTS
 */

export type TechnicalAssessmentStatus =
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWED'


export type TechnicalAssessmentHistoryEventType =
  | 'REQUESTED'
  | 'STARTED'
  | 'UPDATED'
  | 'RECOMMENDATION_ADDED'
  | 'RECOMMENDATION_REMOVED'
  | 'DOCUMENT_ADDED'
  | 'SUBMITTED'
  | 'REVIEWED'


export type TechnicalAssessmentAvailability =
  | 'AVAILABLE'
  | 'LIMITED'
  | 'UNAVAILABLE'


export type TechLead = {
  id: number
  username: string
  full_name: string
  role: 'TECH_LEAD'
  role_display: string
}


export type SoftwareEngineer = {
  id: number
  username: string
  full_name: string
  role: 'SOFTWARE_ENGINEER'
  role_display: string
}


export type TechnicalAssessmentRecommendation = {
  id: number
  assessment: number

  engineer: number
  engineer_name: string
  engineer_username: string

  availability:
    TechnicalAssessmentAvailability

  availability_display: string

  recommendation_notes: string

  recommended_by: number
  recommended_by_name: string

  created_at: string
  updated_at: string
}


export type TechnicalAssessmentDocument = {
  id: number
  assessment: number

  title: string
  description: string

  file: string

  uploaded_by: number
  uploaded_by_name: string

  uploaded_at: string
}


export type TechnicalAssessmentHistory = {
  id: number
  assessment: number

  event_type:
    TechnicalAssessmentHistoryEventType

  event_type_display: string

  description: string

  performed_by: number | null
  performed_by_name: string | null

  metadata:
    Record<string, unknown>

  created_at: string
}


export type TechnicalAssessment = {
  id: number

  lead: number
  lead_company_name: string
  lead_contact_name: string
  lead_status: LeadStatus
  lead_status_display: string

  requested_by: number
  requested_by_name: string

  assigned_to: number
  assigned_to_name: string
  assigned_to_username: string

  requirements: string

  status:
    TechnicalAssessmentStatus

  status_display: string

  technical_comments: string

  submitted_at: string | null

  reviewed_at: string | null
  reviewed_by: number | null
  reviewed_by_name: string | null
  review_notes: string

  created_at: string
  updated_at: string

  recommendations:
    TechnicalAssessmentRecommendation[]

  documents:
    TechnicalAssessmentDocument[]

  history:
    TechnicalAssessmentHistory[]
}


export type CreateTechnicalAssessmentInput = {
  lead: number
  assigned_to: number
  requirements: string
}


export type UpdateTechnicalAssessmentRequestInput =
  Partial<{
    assigned_to: number
    requirements: string
  }>


export type UpdateTechnicalAssessmentWorkInput = {
  technical_comments: string
}


export type ReviewTechnicalAssessmentInput = {
  review_notes: string
}


export type CreateTechnicalAssessmentRecommendationInput = {
  engineer: number

  availability:
    TechnicalAssessmentAvailability

  recommendation_notes?: string
}


export type UploadTechnicalAssessmentDocumentInput = {
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
    localStorage.getItem(
      'accessToken',
    )

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
 * LEADS
 */

export async function getLeads():
Promise<Lead[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/leads/',
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
      | Lead[]
      | PaginatedResponse<Lead>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getLead(
  leadId: number,
): Promise<Lead> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/`,
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
  ) as Lead
}


export async function createLead(
  lead:
    CreateLeadInput,
): Promise<Lead> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/leads/',
      {
        method: 'POST',

        body:
          JSON.stringify(
            lead,
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
  ) as Lead
}


export async function updateLead(
  leadId: number,
  updates:
    UpdateLeadInput,
): Promise<Lead> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/`,
      {
        method: 'PATCH',

        body:
          JSON.stringify(
            updates,
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
  ) as Lead
}


/*
 * HISTORY
 */

export async function getLeadHistory(
  leadId: number,
): Promise<LeadHistory[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/history/`,
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
      | LeadHistory[]
      | PaginatedResponse<LeadHistory>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


/*
 * AI LEAD RESCUE RADAR
 */

export async function analyzeLeadRescueRadar(
  leadId: number,
): Promise<LeadRescueRadarAnalysis> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/rescue-radar/`,
      {
        method: 'POST',
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
  ) as LeadRescueRadarAnalysis
}


/*
 * SALES REPRESENTATIVES
 */

export async function getSalesRepresentatives():
Promise<SalesRepresentative[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/auth/sales-representatives/',
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
      | SalesRepresentative[]
      | PaginatedResponse<SalesRepresentative>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


/*
 * COMMUNICATIONS
 */

export async function getLeadCommunications(
  leadId: number,
): Promise<Communication[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/communications/`,
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
      | Communication[]
      | PaginatedResponse<Communication>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function createLeadCommunication(
  leadId: number,
  communication:
    CreateCommunicationInput,
): Promise<Communication> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/communications/`,
      {
        method:
          'POST',

        body:
          JSON.stringify(
            communication,
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
  ) as Communication
}


/*
 * FOLLOW-UPS
 */

export async function getLeadFollowUps(
  leadId: number,
): Promise<FollowUp[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/follow-ups/`,
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
      | FollowUp[]
      | PaginatedResponse<FollowUp>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getFollowUpReminders():
Promise<FollowUp[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/follow-up-reminders/',
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
      | FollowUp[]
      | PaginatedResponse<FollowUp>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getFollowUp(
  followUpId: number,
): Promise<FollowUp> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/follow-ups/${followUpId}/`,
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
  ) as FollowUp
}


export async function createLeadFollowUp(
  leadId: number,
  followUp:
    CreateFollowUpInput,
): Promise<FollowUp> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/leads/${leadId}/follow-ups/`,
      {
        method:
          'POST',

        body:
          JSON.stringify(
            followUp,
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
  ) as FollowUp
}


export async function updateFollowUp(
  followUpId: number,
  updates:
    UpdateFollowUpInput,
): Promise<FollowUp> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/follow-ups/${followUpId}/`,
      {
        method:
          'PATCH',

        body:
          JSON.stringify(
            updates,
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
  ) as FollowUp
}


/*
 * TECHNICAL ASSESSMENTS
 */

export async function getTechnicalAssessments():
Promise<TechnicalAssessment[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/technical-assessments/',
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
      | TechnicalAssessment[]
      | PaginatedResponse<TechnicalAssessment>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getTechnicalAssessment(
  assessmentId: number,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/`,
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
  ) as TechnicalAssessment
}


export async function getTechLeads():
Promise<TechLead[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/technical-assessments/tech-leads/',
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
  ) as TechLead[]
}


export async function getSoftwareEngineers():
Promise<SoftwareEngineer[]> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/technical-assessments/software-engineers/',
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
  ) as SoftwareEngineer[]
}


export async function createTechnicalAssessment(
  input:
    CreateTechnicalAssessmentInput,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      '/api/v1/crm/technical-assessments/',
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

  return getTechnicalAssessment(
    created.id,
  )
}


export async function updateTechnicalAssessmentRequest(
  assessmentId: number,
  input:
    UpdateTechnicalAssessmentRequestInput,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/request/`,
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

  return getTechnicalAssessment(
    assessmentId,
  )
}


export async function startTechnicalAssessment(
  assessmentId: number,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/start/`,
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
  ) as TechnicalAssessment
}


export async function updateTechnicalAssessmentWork(
  assessmentId: number,
  input:
    UpdateTechnicalAssessmentWorkInput,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/work/`,
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

  return getTechnicalAssessment(
    assessmentId,
  )
}


export async function submitTechnicalAssessment(
  assessmentId: number,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/submit/`,
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
  ) as TechnicalAssessment
}


export async function reviewTechnicalAssessment(
  assessmentId: number,
  input:
    ReviewTechnicalAssessmentInput,
): Promise<TechnicalAssessment> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/review/`,
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
  ) as TechnicalAssessment
}


export async function getTechnicalAssessmentHistory(
  assessmentId: number,
): Promise<TechnicalAssessmentHistory[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/history/`,
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
      | TechnicalAssessmentHistory[]
      | PaginatedResponse<TechnicalAssessmentHistory>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function getTechnicalAssessmentRecommendations(
  assessmentId: number,
): Promise<TechnicalAssessmentRecommendation[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/recommendations/`,
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
      | TechnicalAssessmentRecommendation[]
      | PaginatedResponse<TechnicalAssessmentRecommendation>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function createTechnicalAssessmentRecommendation(
  assessmentId: number,
  input:
    CreateTechnicalAssessmentRecommendationInput,
): Promise<TechnicalAssessmentRecommendation> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/recommendations/`,
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
  ) as TechnicalAssessmentRecommendation
}


export async function deleteTechnicalAssessmentRecommendation(
  assessmentId: number,
  recommendationId: number,
): Promise<void> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/recommendations/${recommendationId}/`,
      {
        method:
          'DELETE',
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }
}


export async function getTechnicalAssessmentDocuments(
  assessmentId: number,
): Promise<TechnicalAssessmentDocument[]> {
  const response =
    await authenticatedRequest(
      `/api/v1/crm/technical-assessments/${assessmentId}/documents/`,
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
      | TechnicalAssessmentDocument[]
      | PaginatedResponse<TechnicalAssessmentDocument>

  if (
    isPaginatedResponse(
      data,
    )
  ) {
    return data.results
  }

  return data
}


export async function uploadTechnicalAssessmentDocument(
  assessmentId: number,
  input:
    UploadTechnicalAssessmentDocumentInput,
): Promise<TechnicalAssessmentDocument> {
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
      `/api/v1/crm/technical-assessments/${assessmentId}/documents/`,
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
  ) as TechnicalAssessmentDocument
}