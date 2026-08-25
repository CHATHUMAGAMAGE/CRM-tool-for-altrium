const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL


export const PROFILE_UPDATED_EVENT =
  'eleven-profile-updated'


export type LoginSuccessResponse = {
  access: string
}


export type MFASetupRequiredResponse = {
  mfa_setup_required: true
  challenge_token: string
  detail: string
}


export type MFAVerificationRequiredResponse = {
  mfa_required: true
  challenge_token: string
  detail: string
}


export type LoginResponse =
  | LoginSuccessResponse
  | MFASetupRequiredResponse
  | MFAVerificationRequiredResponse


export type MFASetupDetails = {
  secret: string
  provisioning_uri: string
  qr_code_data_url: string
  detail: string
}


export type MFASetupCompleteResponse = {
  access: string
  mfa_setup_complete: true
  recovery_codes: string[]
  detail: string
}


export type MFAVerifiedResponse = {
  access: string
  mfa_verified: true
  used_recovery_code: boolean
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
  avatar_url: string | null
}


export type UpdateCurrentUserProfileRequest = {
  firstName: string
  lastName: string
  phoneNumber: string
  avatarFile?: File | null
  removeAvatar?: boolean
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


type ApiErrorResponse = {
  detail?: string
  [field: string]: unknown
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
   * Previous ELEVEN web builds stored JWTs in localStorage.
   * Keep removing those legacy copies so bearer credentials never
   * become persistent JavaScript-readable browser storage again.
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


function setAuthenticatedAccess(
  token: string,
): void {
  clearLegacyBrowserTokens()

  setAccessToken(
    token,
  )
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


async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const errorData =
      (await response.json()) as
        ApiErrorResponse

    if (
      errorData.detail
    ) {
      return errorData.detail
    }

    for (const value of Object.values(errorData)) {
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
  } catch {
    // Use fallback below.
  }

  return fallbackMessage
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
            web_session:
              true,
            remember_me:
              rememberMe,
          }),
      },
    )


  if (!response.ok) {
    clearAccessToken()

    throw new Error(
      await getApiErrorMessage(
        response,
        'Login failed. Please check your credentials.',
      ),
    )
  }


  const result =
    (await response.json()) as
      LoginResponse


  if (
    'mfa_setup_required'
    in result
    || 'mfa_required'
    in result
  ) {
    clearAccessToken()

    return result
  }


  if (
    !result.access
  ) {
    clearAccessToken()

    throw new Error(
      'The authentication service did not return a valid login result.',
    )
  }


  setAuthenticatedAccess(
    result.access,
  )

  return result
}


export async function startMFASetup(
  challengeToken: string,
): Promise<MFASetupDetails> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/mfa/setup/`,
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
            challenge_token:
              challengeToken,
          }),
      },
    )


  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        'Unable to start multi-factor authentication setup.',
      ),
    )
  }


  return (
    await response.json()
  ) as MFASetupDetails
}


export async function confirmMFASetup(
  challengeToken: string,
  code: string,
): Promise<MFASetupCompleteResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/mfa/setup/confirm/`,
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
            challenge_token:
              challengeToken,

            code,
          }),
      },
    )


  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        'Unable to verify the authenticator code.',
      ),
    )
  }


  const result =
    (await response.json()) as
      MFASetupCompleteResponse


  if (
    !result.access
  ) {
    throw new Error(
      'The authentication service did not return an access token.',
    )
  }


  setAuthenticatedAccess(
    result.access,
  )

  return result
}


export async function verifyMFAChallenge(
  challengeToken: string,
  code: string,
): Promise<MFAVerifiedResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/auth/mfa/verify/`,
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
            challenge_token:
              challengeToken,

            code,
          }),
      },
    )


  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        'Unable to verify the security code.',
      ),
    )
  }


  const result =
    (await response.json()) as
      MFAVerifiedResponse


  if (
    !result.access
  ) {
    throw new Error(
      'The authentication service did not return an access token.',
    )
  }


  setAuthenticatedAccess(
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


  setAuthenticatedAccess(
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


export function publishCurrentUserUpdate(
  user: CurrentUser,
): void {
  window.dispatchEvent(
    new CustomEvent<CurrentUser>(
      PROFILE_UPDATED_EVENT,
      {
        detail: user,
      },
    ),
  )
}


export async function updateCurrentUserProfile({
  firstName,
  lastName,
  phoneNumber,
  avatarFile,
  removeAvatar = false,
}: UpdateCurrentUserProfileRequest):
Promise<CurrentUser> {
  const sessionIsValid =
    await ensureValidSession()

  if (!sessionIsValid) {
    throw new Error(
      'Your session has expired. Please log in again.',
    )
  }

  const formData = new FormData()

  formData.set('first_name', firstName.trim())
  formData.set('last_name', lastName.trim())
  formData.set('phone_number', phoneNumber.trim())

  if (avatarFile) {
    formData.set('avatar', avatarFile)
  }

  if (removeAvatar) {
    formData.set('remove_avatar', 'true')
  }

  const makeRequest = (token: string) =>
    fetch(
      `${API_BASE_URL}/api/v1/auth/me/profile/`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    )

  let token = getAccessToken()

  if (!token) {
    token = await refreshAccessToken()
  }

  let response = await makeRequest(token)

  if (response.status === 401) {
    token = await refreshAccessToken()
    response = await makeRequest(token)
  }

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        'Unable to update your profile.',
      ),
    )
  }

  const user =
    (await response.json()) as CurrentUser

  publishCurrentUserUpdate(user)

  return user
}


export async function logoutUser():
Promise<void> {
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
