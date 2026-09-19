export type AssessmentType = 'financial' | 'technical'
export type AssessmentSection = { heading: string; body: string }

const knownHeadings: Record<AssessmentType, string[]> = {
  financial: ['Budget and Cost Estimate', 'Pricing Assumptions', 'Financial Risks', 'Profitability / Margin Considerations', 'Payment and Cash-Flow Considerations', 'Financial Viability', 'Overall Recommendation'],
  technical: ['Technical Feasibility', 'Technical Risks', 'Required Technical Skills', 'Resource Requirements', 'Integration Constraints', 'Security Considerations', 'Overall Recommendation'],
}

export function parseAssessmentSections(markdown: string, assessmentType: AssessmentType): AssessmentSection[] {
  if (!markdown) return []
  const sections: AssessmentSection[] = []
  let heading = ''
  let body: string[] = []
  const flush = () => {
    const content = body.join('\n').trim()
    if (heading || content) sections.push({ heading, body: content })
    body = []
  }

  markdown.split('\n').forEach((line) => {
    const trimmedLine = line.trim()
    const match = trimmedLine.match(/^###\s+(.+)$/)
    if (match) { flush(); heading = match[1].trim(); return }
    const legacyHeading = knownHeadings[assessmentType].find((candidate) => {
      const normalizedLine = trimmedLine.toLowerCase()
      const normalizedHeading = candidate.toLowerCase()
      return normalizedLine === normalizedHeading
        || normalizedLine.startsWith(`${normalizedHeading} `)
        || normalizedLine.startsWith(`${normalizedHeading}:`)
        || normalizedLine.startsWith(`${normalizedHeading} -`)
        || normalizedLine.startsWith(`${normalizedHeading} –`)
        || normalizedLine.startsWith(`${normalizedHeading} —`)
    })
    if (legacyHeading) {
      flush()
      heading = legacyHeading
      body.push(
        trimmedLine
          .slice(legacyHeading.length)
          .replace(/^\s*[:–—-]\s*/, '')
          .trim(),
      )
      return
    }
    body.push(line)
  })
  flush()
  return sections
}
