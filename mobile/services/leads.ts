import { authenticatedRequest } from '@/services/auth';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'CONVERTED'
  | 'LOST';

export type Lead = {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  status_display: string;
  qualification_notes: string;
  lost_reason: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_to_username: string | null;
  created_by: number;
  created_by_name: string;
  created_by_username: string;
  created_at: string;
  updated_at: string;
  converted_at: string | null;
};

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === 'string') {
      return data.detail;
    }

    if (typeof data === 'object' && data !== null) {
      return Object.values(data)
        .flat()
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    }
  } catch {
    // Fall through to the generic message.
  }

  return `Request failed with status ${response.status}.`;
}

export async function getLeads(
  search?: string,
): Promise<Lead[]> {
  const query = search?.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : '';

  const response = await authenticatedRequest(
    `/api/v1/crm/leads/${query}`,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}

export async function getLead(
  id: number,
): Promise<Lead> {
  const response = await authenticatedRequest(
    `/api/v1/crm/leads/${id}/`,
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
}