import { API_BASE_URL } from '@/config/api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '@/services/token-storage';

export type UserRole =
  | 'ADMIN'
  | 'MARKETING'
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'PROJECT_MANAGER'
  | 'SOFTWARE_ENGINEER'
  | 'DIRECTOR';

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  role_display: string;
  phone_number: string;
};

type LoginResponse = {
  access: string;
  refresh: string;
};

type RefreshResponse = {
  access: string;
  refresh?: string;
};

let refreshRequest: Promise<string> | null = null;

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === 'string') {
      return data.detail;
    }

    if (Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join(' ');
    }
  } catch {
    // Fall through to the generic message.
  }

  return `Request failed with status ${response.status}.`;
}

export async function loginUser(
  username: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const tokens: LoginResponse = await response.json();

  await saveTokens(tokens);
}

async function performTokenRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearTokens();
    throw new Error('No refresh token is available.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    await clearTokens();
    throw new Error('Your session has expired. Please sign in again.');
  }

  const tokens: RefreshResponse = await response.json();

  await saveTokens({
    access: tokens.access,
    refresh: tokens.refresh ?? refreshToken,
  });

  return tokens.access;
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = performTokenRefresh();

  try {
    return await refreshRequest;
  } finally {
    refreshRequest = null;
  }
}

export async function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let accessToken = await getAccessToken();

  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }

  const sendRequest = (token: string) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  };

  let response = await sendRequest(accessToken);

  if (response.status !== 401) {
    return response;
  }

  const refreshedAccessToken = await refreshAccessToken();

  response = await sendRequest(refreshedAccessToken);

  return response;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await authenticatedRequest('/api/v1/auth/me/');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}

export async function logoutUser(): Promise<void> {
  const refreshToken = await getRefreshToken();

  try {
    if (refreshToken) {
      await authenticatedRequest('/api/v1/auth/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });
    }
  } finally {
    await clearTokens();
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/forgot-password/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const data = await response.json();
  return data.detail;
}

export async function resetPassword(
  uid: string,
  token: string,
  newPassword: string,
  confirmPassword: string,
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/reset-password/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const data = await response.json();
  return data.detail;
}
