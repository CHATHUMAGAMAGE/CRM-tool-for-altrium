import { ensureValidSession, getAccessToken, refreshAccessToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export type AnalyticsFilters = {
  date_from: string
  date_to: string
  sales_rep?: string
  source?: string
  status?: string
  assessment_stage?: string
  final_decision?: string
  deal_status?: string
}

export type FilterOption = { value: string; label: string }
export type FilterOptions = {
  sales_reps: Array<{ id: number; name: string }>
  sources: FilterOption[]
  statuses: FilterOption[]
  assessment_stages: FilterOption[]
  final_decisions: FilterOption[]
  deal_statuses: FilterOption[]
}

export type SourcePerformance = {
  source: string; source_display: string; leads: number; proceed: number
  deals: number; conversion_rate: number
}
export type TrendPoint = { period: string; grouping: string; leads: number; deals: number; proceed?: number }
export type DashboardData = {
  filters: AnalyticsFilters
  filter_options: FilterOptions
  metric_definitions: Record<string, string>
  kpis: Record<string, number>
  assessment_pipeline?: Record<string, number>
  trend?: TrendPoint[]
  business_trend?: TrendPoint[]
  source_performance: SourcePerformance[]
  team_performance?: Array<Record<string, string | number>>
  attention_required?: Array<{ lead_id: number; lead: string; company: string; issue: string; waiting_days: number }>
  decision_outcomes?: { proceed: number; do_not_proceed: number; pending: number }
  commercial_health?: Record<string, number>
  sales_rep_summary?: Array<Record<string, string | number>>
  pending_approvals?: number
  pipeline_summary?: Record<string, number>
}

export type ReportData = {
  report: string
  title: string
  filters: AnalyticsFilters
  filter_options: FilterOptions
  summary: Record<string, unknown> | Array<Record<string, unknown>>
  records: Array<Record<string, unknown>>
  metrics: Array<{ key: string; label: string; value: string | number; suffix?: string }>
  observations: string[]
  distributions: Record<string, Record<string, number>>
  aging_records: Array<Record<string, unknown>>
  stale_lead_days: number
}

export function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function request(path: string): Promise<Response> {
  if (!await ensureValidSession()) throw new Error('Your session has expired. Please log in again.')
  let token = getAccessToken()
  if (!token) throw new Error('Your session has expired. Please log in again.')
  let response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 401) {
    token = await refreshAccessToken()
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  }
  return response
}

export function filtersToQuery(filters: Partial<AnalyticsFilters>): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
  return params.toString()
}

async function jsonRequest<T>(path: string): Promise<T> {
  const response = await request(path)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail || `Request failed with status ${response.status}.`)
  }
  return response.json() as Promise<T>
}

export function getManagerDashboard(filters: Partial<AnalyticsFilters>) {
  return jsonRequest<DashboardData>(`/api/v1/crm/analytics/manager/dashboard/?${filtersToQuery(filters)}`)
}

export function getExecutiveDashboard(filters: Partial<AnalyticsFilters>) {
  return jsonRequest<DashboardData>(`/api/v1/crm/analytics/executive/dashboard/?${filtersToQuery(filters)}`)
}

export function getReport(name: string, filters: Partial<AnalyticsFilters>) {
  return jsonRequest<ReportData>(`/api/v1/crm/reports/${name}/?${filtersToQuery(filters)}`)
}

export function reportExportPath(name: string, format: 'csv' | 'pdf', filters: Partial<AnalyticsFilters>): string {
  const action = format === 'pdf' ? 'pdf' : 'export'
  return `/api/v1/crm/reports/${name}/${action}/?${filtersToQuery(filters)}`
}

async function downloadResponse(path: string, fallbackFilename: string, errorMessage: string) {
  const response = await request(path)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail || errorMessage)
  }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackFilename
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}

export function downloadReport(name: string, filters: Partial<AnalyticsFilters>) {
  return downloadResponse(reportExportPath(name, 'csv', filters), `${name}-report.csv`, 'The CSV export could not be generated.')
}

export function downloadReportPdf(name: string, filters: Partial<AnalyticsFilters>) {
  return downloadResponse(reportExportPath(name, 'pdf', filters), `ELEVEN_${name}_report.pdf`, 'The PDF could not be generated.')
}
