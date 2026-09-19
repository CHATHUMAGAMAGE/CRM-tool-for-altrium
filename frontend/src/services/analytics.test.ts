import { describe, expect, it } from 'vitest'
import { filtersToQuery, reportExportPath, toLocalISODate } from './analytics'

describe('analytics filter utilities', () => {
  it('omits empty All-filter values from API queries', () => {
    expect(filtersToQuery({
      date_from: '2026-09-01',
      date_to: '2026-09-18',
      sales_rep: '',
      source: '',
      status: '',
      assessment_stage: '',
      final_decision: '',
    })).toBe('date_from=2026-09-01&date_to=2026-09-18')
  })

  it('keeps selected filter values and string sales-rep IDs', () => {
    const query = new URLSearchParams(filtersToQuery({
      date_from: '2026-09-01',
      date_to: '2026-09-18',
      sales_rep: '12',
      source: 'WEBSITE',
      status: 'PROPOSAL',
      assessment_stage: 'DECISION_READY',
      final_decision: 'PROCEED',
    }))

    expect(Object.fromEntries(query.entries())).toEqual({
      date_from: '2026-09-01',
      date_to: '2026-09-18',
      sales_rep: '12',
      source: 'WEBSITE',
      status: 'PROPOSAL',
      assessment_stage: 'DECISION_READY',
      final_decision: 'PROCEED',
    })
  })

  it('formats dates using the local calendar day', () => {
    expect(toLocalISODate(new Date(2026, 8, 1))).toBe('2026-09-01')
  })

  it('builds PDF and CSV export paths with the same active filters', () => {
    const filters = { date_from: '2026-09-01', date_to: '2026-09-30', source: 'WEBSITE' }
    expect(reportExportPath('lead-sources', 'pdf', filters)).toBe('/api/v1/crm/reports/lead-sources/pdf/?date_from=2026-09-01&date_to=2026-09-30&source=WEBSITE')
    expect(reportExportPath('lead-sources', 'csv', filters)).toBe('/api/v1/crm/reports/lead-sources/export/?date_from=2026-09-01&date_to=2026-09-30&source=WEBSITE')
  })
})
