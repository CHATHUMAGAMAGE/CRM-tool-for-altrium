import type { UserRole } from '../auth/roles'
import {
  ensureValidSession,
  refreshAccessToken,
} from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type AdminDashboardSummary = {
  total_users: number
  active_users: number
  inactive_users: number
  role_counts: Record<UserRole, number>
}

export type AdminUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  role_display: string
  phone_number: string
  is_active: boolean
  date_joined: string
  last_login: string | null
}

export type AdminUserFilters = {
  search?: string
  role?: UserRole | ''
  status?: 'active' | 'inactive' | ''
}

export type CreateAdminUserRequest = {
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone_number?: string
}

export type CreateAdminUserResponse = {
  detail: string
  user: AdminUser
}

export type UpdateAdminUserRequest = {
  first_name?: string
  last_name?: string
  email?: string
  role?: UserRole
  phone_number?: string
  is_active?: boolean
}

export type UpdateAdminUserResponse = {
  first_name: string
  last_name: string
  email: string
  role: UserRole
  phone_number: string
  is_active: boolean
}

export type AdminActionResponse = {
  detail: string
}

type ApiErrorResponse = {
  detail?: string
  [field: string]: unknown
}

function extractErrorMessage(
  data: ApiErrorResponse,
  fallbackMessage: string,
): string {
  if (typeof data.detail === 'string') {
    return data.detail
  }

  for (const value of Object.values(data)) {
    if (
      Array.isArray(value) &&
      typeof value[0] === 'string'
    ) {
      return value[0]
    }

    if (typeof value === 'string') {
      return value
    }
  }

  return fallbackMessage
}

async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const hasSession = await ensureValidSession()

  if (!hasSession) {
    throw new Error('Session expired. Please log in again.')
  }

  let accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    throw new Error('Session expired. Please log in again.')
  }

  const makeRequest = (token: string) => {
    const headers = new Headers(options.headers)

    headers.set('Authorization', `Bearer ${token}`)

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  }

  let response = await makeRequest(accessToken)

  if (response.status === 401) {
    accessToken = await refreshAccessToken()
    response = await makeRequest(accessToken)
  }

  return response
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    let message = fallbackMessage

    try {
      const errorData =
        (await response.json()) as ApiErrorResponse

      message = extractErrorMessage(
        errorData,
        fallbackMessage,
      )
    } catch {
      // Use the fallback error message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function getAdminDashboardSummary():
Promise<AdminDashboardSummary> {
  const response = await authenticatedFetch(
    '/api/v1/auth/admin/dashboard-summary/',
  )

  return parseResponse<AdminDashboardSummary>(
    response,
    'Unable to load the admin dashboard summary.',
  )
}

export async function getAdminUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUser[]> {
  const query = new URLSearchParams()

  if (filters.search?.trim()) {
    query.set('search', filters.search.trim())
  }

  if (filters.role) {
    query.set('role', filters.role)
  }

  if (filters.status) {
    query.set('status', filters.status)
  }

  const queryString = query.toString()

  const response = await authenticatedFetch(
    `/api/v1/auth/admin/users/${
      queryString ? `?${queryString}` : ''
    }`,
  )

  return parseResponse<AdminUser[]>(
    response,
    'Unable to load users.',
  )
}

export async function getAdminUser(
  userId: number,
): Promise<AdminUser> {
  const response = await authenticatedFetch(
    `/api/v1/auth/admin/users/${userId}/`,
  )

  return parseResponse<AdminUser>(
    response,
    'Unable to load the selected user.',
  )
}

export async function createAdminUser(
  data: CreateAdminUserRequest,
): Promise<CreateAdminUserResponse> {
  const response = await authenticatedFetch(
    '/api/v1/auth/admin/users/create/',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )

  return parseResponse<CreateAdminUserResponse>(
    response,
    'Unable to create the employee account.',
  )
}

export async function updateAdminUser(
  userId: number,
  data: UpdateAdminUserRequest,
): Promise<UpdateAdminUserResponse> {
  const response = await authenticatedFetch(
    `/api/v1/auth/admin/users/${userId}/update/`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )

  return parseResponse<UpdateAdminUserResponse>(
    response,
    'Unable to update the user.',
  )
}

export async function sendAdminPasswordResetEmail(
  userId: number,
): Promise<AdminActionResponse> {
  const response = await authenticatedFetch(
    `/api/v1/auth/admin/users/${userId}/password-reset-email/`,
    {
      method: 'POST',
    },
  )

  return parseResponse<AdminActionResponse>(
    response,
    'Unable to send the password setup or reset email.',
  )
}