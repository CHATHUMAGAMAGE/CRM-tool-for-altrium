import { authenticatedRequest } from '@/services/auth';

export type DashboardStats = {
  customers: number;
  leads: number;
  opportunities: number;
  projects: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await authenticatedRequest(
    '/api/v1/crm/dashboard/',
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load dashboard statistics. Request failed with status ${response.status}.`,
    );
  }

  return response.json();
}
