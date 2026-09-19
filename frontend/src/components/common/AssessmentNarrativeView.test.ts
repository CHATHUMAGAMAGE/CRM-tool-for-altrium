import { describe, expect, it } from 'vitest'
import { parseAssessmentSections } from '../../utils/assessmentNarrative'

describe('parseAssessmentSections', () => {
  it('splits legacy technical findings whose headings share a line with their content', () => {
    const sections = parseAssessmentSections(
      [
        ' Technical Feasibility The proposed solution is technically feasible.',
        '',
        'Technical Risks: Integration availability must be confirmed.',
        '',
        'Overall Recommendation - Proceed to detailed planning.',
      ].join('\n'),
      'technical',
    )

    expect(sections).toEqual([
      {
        heading: 'Technical Feasibility',
        body: 'The proposed solution is technically feasible.',
      },
      {
        heading: 'Technical Risks',
        body: 'Integration availability must be confirmed.',
      },
      {
        heading: 'Overall Recommendation',
        body: 'Proceed to detailed planning.',
      },
    ])
  })

  it('continues to split generated Markdown headings', () => {
    expect(
      parseAssessmentSections(
        '### Required Technical Skills\n\nAPI and mobile development.\n\n### Resource Requirements\n\nA delivery team.',
        'technical',
      ),
    ).toHaveLength(2)
  })
})
