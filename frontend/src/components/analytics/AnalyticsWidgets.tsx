import type { ReactNode } from 'react'
import { Box, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import type { SourcePerformance, TrendPoint } from '../../services/analytics'

export function MetricCard({ label, value, tooltip, icon, tone = 'primary', onClick }: { label: string; value: string | number; tooltip: string; icon?: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'error'; onClick?: () => void }) {
  const colors = { primary: ['var(--eleven-primary-soft)', 'primary.main'], success: ['var(--eleven-success-soft)', 'success.main'], warning: ['var(--eleven-warning-soft)', 'warning.main'], error: ['var(--eleven-error-soft)', 'error.main'] }[tone]
  return <Card variant="outlined" onClick={onClick} sx={{ height: '100%', minWidth: 0, cursor: onClick ? 'pointer' : 'default', borderColor: 'var(--eleven-border)', boxShadow: 'var(--eleven-shadow)', transition: 'border-color 140ms ease, transform 140ms ease', '&:hover': onClick ? { borderColor: 'primary.main', transform: 'translateY(-1px)' } : {} }}><CardContent sx={{ p: '16px !important' }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}><Box sx={{ width: 38, height: 38, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: colors[0], color: colors[1], '& svg': { fontSize: 21 } }}>{icon}</Box><Tooltip title={tooltip}><InfoOutlined sx={{ fontSize: 16, color: 'text.disabled' }} /></Tooltip></Stack>
    <Typography variant="h4" sx={{ fontWeight: 780, mt: 1.25, lineHeight: 1 }}>{value}</Typography>
    <Typography color="text.secondary" sx={{ fontSize: 12.5, fontWeight: 650, mt: .65 }}>{label}</Typography>
  </CardContent></Card>
}

export function Section({ title, subtitle, action, children, accent }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; accent?: 'warning' }) {
  return <Card variant="outlined" sx={{ height: '100%', borderColor: accent === 'warning' ? 'rgba(220,104,3,.35)' : 'var(--eleven-border)', boxShadow: 'var(--eleven-shadow)', overflow: 'hidden' }}><CardContent sx={{ p: '18px !important' }}><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}><Box><Typography variant="h6" sx={{ fontSize: 16, fontWeight: 750 }}>{title}</Typography>{subtitle && <Typography color="text.secondary" sx={{ fontSize: 12.5, mt: .25 }}>{subtitle}</Typography>}</Box>{action}</Stack><Box sx={{ mt: 2 }}>{children}</Box></CardContent></Card>
}

export function SourceBars({ rows, onSelect }: { rows: SourcePerformance[]; onSelect?: (source: string) => void }) {
  const max = Math.max(...rows.map((row) => row.leads), 1)
  if (!rows.length) return <EmptyState text="No source activity for this period." />
  return <Stack spacing={1.55}>{rows.map((row) => <Box key={row.source} onClick={() => onSelect?.(row.source)} sx={{ cursor: onSelect ? 'pointer' : 'default', p: .5, mx: -.5, borderRadius: 1, '&:hover': onSelect ? { bgcolor: 'action.hover' } : {} }}><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Typography sx={{ fontSize: 12.5, fontWeight: 650, minWidth: 90 }}>{row.source_display}</Typography><Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}><Typography sx={{ fontSize: 11.5 }}><b>{row.leads}</b> Leads</Typography><Typography color="success.main" sx={{ fontSize: 11.5 }}><b>{row.deals}</b> Deals</Typography><Chip size="small" label={`${row.conversion_rate}%`} sx={{ height: 22, fontSize: 10.5 }} /></Stack></Stack><Box sx={{ position: 'relative', height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden', mt: .7 }}><Box sx={{ width: `${row.leads / max * 100}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 4 }} /><Box sx={{ position: 'absolute', inset: 0, width: `${row.deals / max * 100}%`, bgcolor: 'success.main', borderRadius: 4 }} /></Box></Box>)}</Stack>
}

export function TrendChart({ rows, executive = false }: { rows: TrendPoint[]; executive?: boolean }) {
  if (!rows.length) return <EmptyState text="No trend data for this period." />
  const series = executive ? ['leads', 'proceed', 'deals'] as const : ['leads', 'deals'] as const
  const colors = { leads: '#0b5cff', deals: '#039855', proceed: '#dc6803' }
  const max = Math.max(...rows.flatMap((row) => series.map((key) => Number(row[key] || 0))), 1)
  if (rows.length === 1) return <Stack direction="row" spacing={2} sx={{ minHeight: 180, alignItems: 'flex-end', justifyContent: 'center' }}>{series.map((key) => <Stack key={key} sx={{ alignItems: 'center' }}><Box sx={{ width: 52, height: Math.max(Number(rows[0][key] || 0) / max * 130, 4), bgcolor: colors[key], borderRadius: '6px 6px 0 0' }} /><Typography sx={{ fontWeight: 700, mt: .5 }}>{rows[0][key] || 0}</Typography><Typography color="text.secondary" sx={{ fontSize: 11, textTransform: 'capitalize' }}>{key}</Typography></Stack>)}</Stack>
  const point = (value: number, index: number) => `${40 + index * (520 / (rows.length - 1))},${150 - value / max * 120}`
  return <Box><Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', mb: 1 }}>{series.map((key) => <Stack key={key} direction="row" spacing={.6} sx={{ alignItems: 'center' }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors[key] }} /><Typography color="text.secondary" sx={{ fontSize: 11.5, textTransform: 'capitalize' }}>{key}</Typography></Stack>)}</Stack><Box sx={{ width: '100%', overflow: 'hidden' }}><svg viewBox="0 0 600 190" width="100%" role="img" aria-label="Performance trend chart">{[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1="40" y1={150-ratio*120} x2="570" y2={150-ratio*120} stroke="var(--eleven-border)" strokeWidth="1" /><text x="32" y={154-ratio*120} textAnchor="end" fontSize="9" fill="var(--eleven-text-muted)">{Math.round(max*ratio)}</text></g>)}{series.map((key) => <g key={key}><polyline points={rows.map((row,index) => point(Number(row[key] || 0), index)).join(' ')} fill="none" stroke={colors[key]} strokeWidth="2.5" strokeLinejoin="round" />{rows.map((row,index) => { const [cx,cy] = point(Number(row[key] || 0),index).split(','); return <circle key={row.period} cx={cx} cy={cy} r="4" fill={colors[key]} stroke="white" strokeWidth="2"><title>{`${key}: ${row[key] || 0} · ${row.period}`}</title></circle> })}</g>)}{rows.map((row,index) => <text key={row.period} x={40+index*(520/(rows.length-1))} y="174" textAnchor="middle" fontSize="9" fill="var(--eleven-text-muted)">{row.period.slice(5)}</text>)}</svg></Box></Box>
}

export function EmptyState({ text }: { text: string }) {
  return <Box sx={{ py: 5, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}><Typography color="text.secondary" sx={{ fontSize: 13 }}>{text}</Typography></Box>
}
