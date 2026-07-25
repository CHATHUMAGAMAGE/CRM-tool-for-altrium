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