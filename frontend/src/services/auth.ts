const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type LoginResponse = {
  access: string
  refresh: string
}

export type CurrentUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  role_display: string
  phone_number: string
}

type LoginErrorResponse = {
  detail?: string
}

export async function loginUser(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/login/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    },
  )

  if (!response.ok) {
    let message = 'Login failed. Please check your credentials.'

    try {
      const errorData =
        (await response.json()) as LoginErrorResponse

      if (errorData.detail) {
        message = errorData.detail
      }
    } catch {
      // Use the default error message.
    }

    throw new Error(message)
  }

  return (await response.json()) as LoginResponse
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    throw new Error('No access token found.')
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/me/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Unable to retrieve the current user.')
  }

  return (await response.json()) as CurrentUser
}

export function logoutUser(): void {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}


type JwtPayload = {
  exp?: number
}

export function hasValidAccessToken(): boolean {
  const accessToken = localStorage.getItem('accessToken')

  if (!accessToken) {
    return false
  }

  try {
    const payloadSegment = accessToken.split('.')[1]

    if (!payloadSegment) {
      return false
    }

    const base64 = payloadSegment
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const paddedBase64 = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      '=',
    )

    const payload = JSON.parse(atob(paddedBase64)) as JwtPayload

    if (typeof payload.exp !== 'number') {
      return false
    }

    return payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
type RefreshResponse = {
  access: string
  refresh?: string
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    throw new Error('No refresh token found.')
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/refresh/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    },
  )

  if (!response.ok) {
    logoutUser()
    throw new Error('Session expired. Please log in again.')
  }

  const tokens = (await response.json()) as RefreshResponse

  localStorage.setItem('accessToken', tokens.access)

  if (tokens.refresh) {
    localStorage.setItem('refreshToken', tokens.refresh)
  }

  return tokens.access
}

let refreshRequest: Promise<string> | null = null

export async function ensureValidSession(): Promise<boolean> {
  if (hasValidAccessToken()) {
    return true
  }

  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    logoutUser()
    return false
  }

  try {
    if (!refreshRequest) {
      refreshRequest = refreshAccessToken().finally(() => {
        refreshRequest = null
      })
    }

    await refreshRequest

    return hasValidAccessToken()
  } catch {
    logoutUser()
    return false
  }
}