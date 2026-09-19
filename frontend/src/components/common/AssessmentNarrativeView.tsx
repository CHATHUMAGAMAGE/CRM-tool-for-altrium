import { useMemo, useState, type ReactNode } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import {
  AccountBalanceWalletOutlined,
  CheckCircleOutlineRounded,
  CreditCardRounded,
  DescriptionOutlined,
  EngineeringOutlined,
  GroupsOutlined,
  IntegrationInstructionsOutlined,
  SecurityRounded,
  TrendingUpRounded,
  WarningAmberRounded,
} from '@mui/icons-material'
import FormattedNarrative from './FormattedNarrative'
import { formatNarrativeToMarkdown } from '../../utils/formatNarrative'
import { parseAssessmentSections, type AssessmentType } from '../../utils/assessmentNarrative'

type Props = {
  content: string | null | undefined
  assessmentType: AssessmentType
  outcome?: string | null
  title: string
  subtitle: string
  emptyMessage?: string
  showRawToggle?: boolean
  singleColumn?: boolean
}

const sectionIcons: Record<string, ReactNode> = {
  'budget and cost estimate': <AccountBalanceWalletOutlined />,
  'pricing assumptions': <DescriptionOutlined />,
  'financial risks': <WarningAmberRounded />,
  'profitability / margin considerations': <TrendingUpRounded />,
  'payment and cash-flow considerations': <CreditCardRounded />,
  'financial viability': <SecurityRounded />,
  'technical feasibility': <EngineeringOutlined />,
  'technical risks': <WarningAmberRounded />,
  'required technical skills': <GroupsOutlined />,
  'resource requirements': <GroupsOutlined />,
  'integration constraints': <IntegrationInstructionsOutlined />,
  'security considerations': <SecurityRounded />,
  'overall recommendation': <CheckCircleOutlineRounded />,
}

export default function AssessmentNarrativeView({ content, assessmentType, outcome, title, subtitle, emptyMessage = 'No findings have been recorded.', showRawToggle = true, singleColumn = false }: Props) {
  const [raw, setRaw] = useState(false)
  const markdown = useMemo(() => formatNarrativeToMarkdown(content), [content])
  const sections = useMemo(() => parseAssessmentSections(markdown, assessmentType), [assessmentType, markdown])

  return <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5 }}>
      <Box><Typography sx={{ fontSize: 16, fontWeight: 700 }}>{title}</Typography><Typography color="text.secondary" sx={{ mt: .3, fontSize: 12.5 }}>{subtitle}</Typography></Box>
      {showRawToggle && markdown && <Stack direction="row" spacing={.5} role="group" aria-label={`${title} display mode`}><Button size="small" variant={!raw ? 'contained' : 'text'} onClick={() => setRaw(false)}>Formatted</Button><Button size="small" variant={raw ? 'contained' : 'text'} onClick={() => setRaw(true)}>Raw</Button></Stack>}
    </Stack>

    {!markdown ? <Box sx={{ mt: 2 }}><FormattedNarrative content="" emptyMessage={emptyMessage} /></Box> : raw ? <Box component="pre" sx={{ mt: 2, mb: 0, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper', color: 'text.primary', font: 'inherit', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{content}</Box> : <Box sx={{ display: 'grid', gridTemplateColumns: singleColumn ? 'minmax(0, 1fr)' : { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, mt: 2 }}>
      {sections.map((section, index) => {
        const key = section.heading.toLowerCase()
        const recommendation = key === 'overall recommendation'
        const firstPrimary = (assessmentType === 'financial' && key === 'budget and cost estimate') || (assessmentType === 'technical' && key === 'technical feasibility')
        const suitable = outcome === 'FINANCIALLY_SUITABLE'
        const unsuitable = outcome === 'FINANCIALLY_UNSUITABLE'
        return <Box key={`${section.heading}-${index}`} component="section" sx={{ minWidth: 0, gridColumn: firstPrimary || !section.heading ? '1 / -1' : 'auto', p: { xs: 1.75, sm: 2 }, border: '1px solid', borderColor: recommendation && suitable ? 'rgba(3,152,85,.3)' : recommendation && unsuitable ? 'rgba(217,45,32,.3)' : 'var(--eleven-border)', borderRadius: 2, bgcolor: recommendation && suitable ? 'var(--eleven-success-soft)' : recommendation && unsuitable ? 'var(--eleven-error-soft)' : 'background.paper', boxShadow: 'var(--eleven-shadow)' }}>
          {section.heading && <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, color: recommendation && suitable ? 'success.main' : recommendation && unsuitable ? 'error.main' : key.includes('risk') ? 'warning.main' : 'primary.main' }}><Box sx={{ display: 'grid', placeItems: 'center', '& svg': { fontSize: 19 } }}>{sectionIcons[key] || <DescriptionOutlined />}</Box><Typography component="h3" sx={{ color: 'text.primary', fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{section.heading}</Typography></Stack>}
          {recommendation && (suitable || unsuitable) && <Typography sx={{ mb: .75, color: suitable ? 'success.main' : 'error.main', fontSize: 11.5, fontWeight: 800, letterSpacing: '.045em' }}>{suitable ? 'FINANCIALLY VIABLE' : 'NOT FINANCIALLY VIABLE'}</Typography>}
          <FormattedNarrative content={section.body} compact emptyMessage="No supporting detail was recorded." />
        </Box>
      })}
    </Box>}
  </Box>
}
