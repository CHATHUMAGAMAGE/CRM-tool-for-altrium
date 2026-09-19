const MARKDOWN_STRUCTURE = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|~~~|\|)/
const MAX_HEADING_LENGTH = 72
const MAX_HEADING_WORDS = 9

function titleCase(label: string): string {
  return label
    .split(/(\s+|\/)/)
    .map((part) => {
      if (/^\s+$|^\/$/.test(part) || /^[A-Z0-9-]{2,}$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('')
}

function isStandaloneSectionLabel(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.endsWith(':') || trimmed.length > MAX_HEADING_LENGTH) return false
  if (MARKDOWN_STRUCTURE.test(trimmed) || trimmed.includes('://')) return false
  const label = trimmed.slice(0, -1).trim()
  if (!label || label.split(/\s+/).length > MAX_HEADING_WORDS) return false
  if (/[.!?;]/.test(label) || !/^[\p{L}\p{N}][\p{L}\p{N}\s/&()+,'-]*$/u.test(label)) return false
  return true
}

/**
 * Adds presentation-only Markdown structure without rewriting narrative content.
 * Stored values remain untouched; numbers, dates, currency and prose are preserved.
 */
export function formatNarrativeToMarkdown(content: string | null | undefined): string {
  if (!content?.trim()) return ''

  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (isStandaloneSectionLabel(line)) {
      if (output.length && output[output.length - 1] !== '') output.push('')
      output.push(`### ${titleCase(trimmed.slice(0, -1).trim())}`, '')
      return
    }
    if (/^\s*•\s+/.test(line)) {
      output.push(line.replace(/^\s*•\s+/, '- '))
      return
    }
    output.push(line)
  })

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
