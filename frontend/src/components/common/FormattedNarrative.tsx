import { useMemo, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatNarrativeToMarkdown } from '../../utils/formatNarrative'

type Props = {
  content: string | null | undefined
  emptyMessage?: string
  compact?: boolean
  showRawToggle?: boolean
}

export default function FormattedNarrative({ content, emptyMessage = 'No narrative has been recorded.', compact = false, showRawToggle = false }: Props) {
  const [raw, setRaw] = useState(false)
  const markdown = useMemo(() => formatNarrativeToMarkdown(content), [content])

  if (!markdown) return <Typography color="text.secondary" sx={{ fontSize: 13, fontStyle: 'italic' }}>{emptyMessage}</Typography>

  return <Box sx={{ maxWidth: compact ? 760 : 920, minWidth: 0 }}>
    {showRawToggle && <Stack direction="row" spacing={.5} sx={{ justifyContent: 'flex-end', mb: 1 }}><Button size="small" variant={!raw ? 'contained' : 'text'} onClick={() => setRaw(false)}>Formatted</Button><Button size="small" variant={raw ? 'contained' : 'text'} onClick={() => setRaw(true)}>Raw</Button></Stack>}
    {raw ? <Box component="pre" sx={{ m: 0, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'action.hover', color: 'text.primary', font: 'inherit', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{content}</Box> : <Box className="formatted-narrative" sx={{ color: 'text.primary', overflowWrap: 'anywhere', '& h1, & h2, & h3, & h4, & h5, & h6': { mt: compact ? 1.5 : 2.25, mb: .75, fontSize: compact ? 13.5 : 15, lineHeight: 1.35, fontWeight: 700, color: 'text.primary' }, '& h1:first-of-type, & h2:first-of-type, & h3:first-of-type': { mt: 0 }, '& p': { my: 1, fontSize: compact ? 12.5 : 13.5, lineHeight: 1.65, color: 'text.secondary' }, '& ul, & ol': { my: 1, pl: 3.25 }, '& li': { mb: .65, pl: .25, fontSize: compact ? 12.5 : 13.5, lineHeight: 1.55, color: 'text.secondary' }, '& blockquote': { my: 1.5, mx: 0, pl: 1.5, borderLeft: '3px solid', borderColor: 'primary.main', color: 'text.secondary' }, '& a': { color: 'primary.main', fontWeight: 600 }, '& code': { px: .5, py: .15, borderRadius: .5, bgcolor: 'action.hover', fontSize: '.9em' }, '& pre': { overflowX: 'auto', p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }, '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 2 } }}><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ node, ...props }) => { void node; return <a {...props} target="_blank" rel="noopener noreferrer" /> } }}>{markdown}</ReactMarkdown></Box>}
  </Box>
}
