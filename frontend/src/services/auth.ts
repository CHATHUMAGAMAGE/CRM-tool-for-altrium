const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL


export type LoginResponse = {
  access: string
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


export type ResetPasswordRequest = {
  uid: string
  token: string
  newPassword: string
  confirmPassword: string
}


export type PasswordRecoveryResponse = {
  detail: string
}


type LoginErrorResponse = {
  detail?: string
}


type PasswordRecoveryErrorResponse = {
  detail?: string
  email?: string[]
}


type JwtPayload = {
  exp?: number
}


type RefreshResponse = {
  access: string
}


let accessToken:
  string | null =
  null


let refreshRequest:
  Promise<string> | null =
  null


function clearLegacyBrowserTokens():
void {
  /*
   * Migration cleanup:
   * previous ELEVEN web builds stored JWTs in localStorage.
   * Remove those copies so a successful migration does not leave
   * old bearer credentials available to JavaScript.
   */
  try {
    localStorage.removeItem(
      'accessToken',
    )

    localStorage.removeItem(
      'refreshToken',
    )
  } catch {
    // Browser storage may be unavailable in restricted environments.
  }
}


clearLegacyBrowserTokens()


function setAccessToken(
  token:
    string | null,
): void {
  accessToken =
    token
}


export function getAccessToken():
string | null {
  return accessToken
}


export function clearAccessToken():
void {
  setAccessToken(
    null,
  )

  clearLegacyBrowserTokens()
}


export async function loginUser(
  username: string,
  password: string,
  rememberMe:
    boolean = false,
): Promise<LoginResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/login/`,
      {
        method:
          'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            username,
            password,

            // Tells the shared backend that this is the browser flow.
            // Mobile clients do not send this flag and retain the
            // existing token-pair API contract.
            web_session:
              true,

            remember_me:
              rememberMe,
          }),
      },
    )


  if (!response.ok) {
    clearAccessToken()

    let message =
      'Login failed. Please check your credentials.'

    try {
      const errorData =
        (await response.json()) as
          LoginErrorResponse

      if (
        errorData.detail
      ) {
        message =
          errorData.detail
      }
    } catch {
      // Use the default error message.
    }

    throw new Error(
      message,
    )
  }


  const result =
    (await response.json()) as
      LoginResponse


  if (
    !result.access
  ) {
    clearAccessToken()

    throw new Error(
      'The authentication service did not return an access token.',
    )
  }


  setAccessToken(
    result.access,
  )

  return result
}


export async function forgotPassword(
  email: string,
): Promise<PasswordRecoveryResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/forgot-password/`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            email,
          }),
      },
    )


  if (!response.ok) {
    let message =
      'Unable to process your password reset request.'

    try {
      const errorData =
        (await response.json()) as
          PasswordRecoveryErrorResponse

      if (
        errorData.detail
      ) {
        message =
          errorData.detail
      } else if (
        errorData.email?.[0]
      ) {
        message =
          errorData.email[0]
      }
    } catch {
      // Use the default error message.
    }

    throw new Error(
      message,
    )
  }


  return (
    await response.json()
  ) as PasswordRecoveryResponse
}


export async function resetPassword({
  uid,
  token,
  newPassword,
  confirmPassword,
}: ResetPasswordRequest):
Promise<PasswordRecoveryResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/reset-password/`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            uid,
            token,

            new_password:
              newPassword,

            confirm_password:
              confirmPassword,
          }),
      },
    )


  if (!response.ok) {
    let message =
      'Unable to reset your password. The link may have expired.'

    try {
      const errorData =
        (await response.json()) as {
          detail?: string
          new_password?: string[]
          confirm_password?: string[]
          non_field_errors?: string[]
        }

      if (
        errorData.detail
      ) {
        message =
          errorData.detail
      } else if (
        errorData.new_password?.[0]
      ) {
        message =
          errorData.new_password[0]
      } else if (
        errorData.confirm_password?.[0]
      ) {
        message =
          errorData.confirm_password[0]
      } else if (
        errorData.non_field_errors?.[0]
      ) {
        message =
          errorData.non_field_errors[0]
      }
    } catch {
      // Use the default error message.
    }

    throw new Error(
      message,
    )
  }


  clearAccessToken()

  return (
    await response.json()
  ) as PasswordRecoveryResponse
}


export function hasValidAccessToken():
boolean {
  const token =
    getAccessToken()

  if (
    !token
  ) {
    return false
  }


  try {
    const payloadSegment =
      token.split(
        '.',
      )[1]

    if (
      !payloadSegment
    ) {
      return false
    }


    const base64 =
      payloadSegment
        .replace(
          /-/g,
          '+',
        )
        .replace(
          /_/g,
          '/',
        )


    const paddedBase64 =
      base64.padEnd(
        Math.ceil(
          base64.length /
            4,
        ) *
          4,
        '=',
      )


    const payload =
      JSON.parse(
        atob(
          paddedBase64,
        ),
      ) as JwtPayload


    if (
      typeof payload.exp !==
      'number'
    ) {
      return false
    }


    return (
      payload.exp >
      Math.floor(
        Date.now() /
          1000,
      )
    )
  } catch {
    return false
  }
}


export async function refreshAccessToken():
Promise<string> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/refresh/`,
      {
        method:
          'POST',

        credentials:
          'include',
      },
    )


  if (!response.ok) {
    clearAccessToken()

    throw new Error(
      'Session expired. Please log in again.',
    )
  }


  const result =
    (await response.json()) as
      RefreshResponse


  if (
    !result.access
  ) {
    clearAccessToken()

    throw new Error(
      'The authentication service did not return an access token.',
    )
  }


  setAccessToken(
    result.access,
  )

  return result.access
}


export async function ensureValidSession():
Promise<boolean> {
  if (
    hasValidAccessToken()
  ) {
    return true
  }


  try {
    if (
      !refreshRequest
    ) {
      refreshRequest =
        refreshAccessToken()
          .finally(
            () => {
              refreshRequest =
                null
            },
          )
    }


    await refreshRequest

    return hasValidAccessToken()
  } catch {
    clearAccessToken()

    return false
  }
}


export async function getCurrentUser():
Promise<CurrentUser> {
  const sessionIsValid =
    await ensureValidSession()

  if (
    !sessionIsValid
  ) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }


  const token =
    getAccessToken()

  if (
    !token
  ) {
    throw new Error(
      'No access token is available.',
    )
  }


  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/me/`,
      {
        method:
          'GET',

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    )


  if (
    response.status ===
    401
  ) {
    const refreshedToken =
      await refreshAccessToken()

    const retryResponse =
      await fetch(
        `${API_BASE_URL}/api/v1/auth/me/`,
        {
          method:
            'GET',

          headers: {
            Authorization:
              `Bearer ${refreshedToken}`,
          },
        },
      )

    if (
      !retryResponse.ok
    ) {
      throw new Error(
        'Unable to retrieve the current user.',
      )
    }

    return (
      await retryResponse.json()
    ) as CurrentUser
  }


  if (
    !response.ok
  ) {
    throw new Error(
      'Unable to retrieve the current user.',
    )
  }


  return (
    await response.json()
  ) as CurrentUser
}


export async function logoutUser():
Promise<void> {
  /*
   * Remove the bearer token from JavaScript immediately. The server
   * request then blacklists the HttpOnly refresh token and expires the
   * cookie. If the network is unavailable, no access JWT remains in
   * browser storage or module memory.
   */
  clearAccessToken()

  try {
    await fetch(
      `${API_BASE_URL}/api/v1/auth/logout/`,
      {
        method:
          'POST',

        credentials:
          'include',
      },
    )
  } catch {
    // The local in-memory access token is already gone.
  } finally {
    clearAccessToken()
  }
}
