const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!configuredApiBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is not configured. Create mobile/.env from mobile/.env.example.',
  );
}

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, '');
