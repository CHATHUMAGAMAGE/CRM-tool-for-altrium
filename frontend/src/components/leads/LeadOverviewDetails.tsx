import { Box, Chip, Grid, Link, Stack, Typography } from '@mui/material'
import { AccountBalanceWalletOutlined, BusinessOutlined, CalendarTodayRounded, EmailOutlined, PhoneOutlined, SourceOutlined } from '@mui/icons-material'
import FormattedNarrative from '../common/FormattedNarrative'
import type { Lead } from '../../services/crm'

const sourceLabels: Record<string, string> = { WEBSITE: 'Website', SOCIAL_MEDIA: 'Social media', REFERRAL: 'Referral', DIRECT: 'Direct', OTHER: 'Other' }

function amount(value: string | null): string {
  if (!value) return '—'
  const number = Number(value)
  return Number.isFinite(number) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(number) : value
}

function budget(lead: Lead): string {
  if (!lead.budget_min && !lead.budget_max) return 'Not discussed'
  const currency = lead.budget_currency ? `${lead.budget_currency} ` : ''
  if (lead.budget_min && lead.budget_max) return `${currency}${amount(lead.budget_min)} – ${amount(lead.budget_max)}`
  return `${currency}${amount(lead.budget_min || lead.budget_max)}`
}

function SummaryCard({ icon, label, value, secondary }: { icon: ReactNode; label: string; value: string; secondary?: string }) {
  return <Box sx={{ height: '100%', p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}><Box sx={{ mt: .1, color: 'primary.main', '& svg': { fontSize: 19 } }}>{icon}</Box><Box sx={{ minWidth: 0 }}><Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.035em' }}>{label}</Typography><Typography sx={{ mt: .35, fontSize: 13.5, fontWeight: 650, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{value}</Typography>{secondary && <Typography color="text.secondary" sx={{ mt: .3, fontSize: 11.5, lineHeight: 1.45 }}>{secondary}</Typography>}</Box></Stack></Box>
}

export default function LeadOverviewDetails({ lead }: { lead: Lead }) {
  const source = lead.source ? sourceLabels[lead.source] || lead.source : 'Not provided'
  return <Stack spacing={2.25} sx={{ p: { xs: 1.75, sm: 2.5 } }}>
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'var(--eleven-surface-soft)' }}><Typography sx={{ fontSize: 20, lineHeight: 1.3, fontWeight: 750, overflowWrap: 'anywhere' }}>{lead.project_name || 'Unnamed Lead'}</Typography><Typography color="text.secondary" sx={{ mt: .4, fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{lead.company_name}</Typography><Typography color="text.secondary" sx={{ mt: .15, fontSize: 12.5 }}>{lead.contact_name}</Typography><Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: .75, mt: 1.4 }}>{lead.project_nature && <Chip size="small" label={lead.project_nature} color="primary" variant="outlined" />}<Chip size="small" label={source} variant="outlined" /><Chip size="small" label={lead.status_display} color={lead.status === 'LOST' || lead.status === 'DISQUALIFIED' ? 'error' : lead.status === 'WON' ? 'success' : 'default'} variant="outlined" /></Stack></Box>

    <Box><Typography sx={{ mb: 1, fontSize: 11.5, fontWeight: 750, color: 'text.secondary', letterSpacing: '.06em' }}>PROJECT CONTEXT</Typography><Grid container spacing={1.5}><Grid size={{ xs: 12, md: 6 }}><Box sx={{ height: '100%', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Typography sx={{ mb: 1, fontSize: 14.5, fontWeight: 700 }}>Business Requirement</Typography><FormattedNarrative content={lead.requirement} compact emptyMessage="No business requirement has been recorded." /></Box></Grid><Grid size={{ xs: 12, md: 6 }}><Box sx={{ height: '100%', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Typography sx={{ mb: 1, fontSize: 14.5, fontWeight: 700 }}>Project Scope</Typography><FormattedNarrative content={lead.project_scope} compact emptyMessage="No project scope has been recorded." /></Box></Grid></Grid></Box>

    <Box><Typography sx={{ mb: 1, fontSize: 11.5, fontWeight: 750, color: 'text.secondary', letterSpacing: '.06em' }}>COMMERCIAL & DELIVERY</Typography><Grid container spacing={1.25}><Grid size={{ xs: 12, sm: 6, xl: 4 }}><SummaryCard icon={<AccountBalanceWalletOutlined />} label="Client Budget" value={budget(lead)} /></Grid><Grid size={{ xs: 12, sm: 6, xl: 4 }}><SummaryCard icon={<CalendarTodayRounded />} label="Expected Timeline" value={lead.expected_timeline || 'Not provided'} /></Grid><Grid size={{ xs: 12, sm: 6, xl: 4 }}><SummaryCard icon={<SourceOutlined />} label="Lead Source" value={source} secondary={lead.source_details || undefined} /></Grid></Grid></Box>

    <Box><Typography sx={{ mb: 1, fontSize: 11.5, fontWeight: 750, color: 'text.secondary', letterSpacing: '.06em' }}>CONTACT INFORMATION</Typography><Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Stack spacing={1.25}><Stack direction="row" spacing={1}><BusinessOutlined sx={{ fontSize: 18, color: 'text.secondary' }} /><Box><Typography color="text.secondary" sx={{ fontSize: 10.5 }}>CONTACT / COMPANY</Typography><Typography sx={{ fontSize: 13, fontWeight: 650 }}>{lead.contact_name} · {lead.company_name}</Typography></Box></Stack><Stack direction="row" spacing={1}><EmailOutlined sx={{ fontSize: 18, color: 'text.secondary' }} /><Link href={lead.email ? `mailto:${lead.email}` : undefined} underline={lead.email ? 'hover' : 'none'} sx={{ fontSize: 13, overflowWrap: 'anywhere' }}>{lead.email || '—'}</Link></Stack><Stack direction="row" spacing={1}><PhoneOutlined sx={{ fontSize: 18, color: 'text.secondary' }} /><Link href={lead.phone ? `tel:${lead.phone}` : undefined} underline={lead.phone ? 'hover' : 'none'} sx={{ fontSize: 13, overflowWrap: 'anywhere' }}>{lead.phone || '—'}</Link></Stack></Stack></Box></Box>
  </Stack>
}
import type { ReactNode } from 'react'
