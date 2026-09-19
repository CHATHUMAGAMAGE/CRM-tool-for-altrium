import { describe, expect, it } from 'vitest'
import { formatNarrativeToMarkdown } from './formatNarrative'

describe('formatNarrativeToMarkdown', () => {
  it.each([['', ''], [null, ''], [undefined, '']])('handles empty content', (input, expected) => {
    expect(formatNarrativeToMarkdown(input)).toBe(expected)
  })

  it('formats a standalone section label', () => {
    expect(formatNarrativeToMarkdown('Financial risks:\nPotential API integration cost.'))
      .toBe('### Financial Risks\n\nPotential API integration cost.')
  })

  it('formats multiple sections without changing their content', () => {
    const input = 'Pricing assumptions:\nLKR 7,500,000–8,500,000 at 12.5%.\n\nOverall recommendation:\nFinancially Suitable.'
    expect(formatNarrativeToMarkdown(input)).toBe('### Pricing Assumptions\n\nLKR 7,500,000–8,500,000 at 12.5%.\n\n### Overall Recommendation\n\nFinancially Suitable.')
  })

  it('does not turn a normal sentence containing a colon into a heading', () => {
    const sentence = 'The client said: API access will be provided later.'
    expect(formatNarrativeToMarkdown(sentence)).toBe(sentence)
  })

  it('preserves existing Markdown, numbered lists, dates and URLs', () => {
    const input = '## Existing Heading\n\n1. First item\n2. Second item\n\nDue 18 Sep 2026: https://example.com/api'
    expect(formatNarrativeToMarkdown(input)).toBe(input)
  })

  it('preserves dash and star bullets and normalizes bullet glyphs', () => {
    const input = '- Existing\n* Also existing\n• Visual bullet'
    expect(formatNarrativeToMarkdown(input)).toBe('- Existing\n* Also existing\n- Visual bullet')
  })

  it('preserves paragraphs', () => {
    const input = 'First paragraph.\n\nSecond paragraph.'
    expect(formatNarrativeToMarkdown(input)).toBe(input)
  })
})
