import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { AccountBalanceWalletOutlined, CheckCircleOutlineRounded, GavelRounded, PendingActionsRounded, RefreshRounded, RequestQuoteOutlined } from '@mui/icons-material'
import { getCommercialExceptions, reviewCommercialException, type CommercialException } from '../services/financialCrm'

type StatusFilter = 'ALL' | CommercialException['status']
const money = (currency: string, value: string | null) => {
  if (!value) return 'Not provided'
  const amount = Number(value)
  return `${currency || ''} ${Number.isFinite(amount) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount) : value}`.trim()
}
const statusColor = (status: CommercialException['status']) => status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'warning'

export default function CommercialExceptionsPage() {
  const [items, setItems] = useState<CommercialException[]>([])
  const [selected, setSelected] = useState<CommercialException | null>(null)
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [comments, setComments] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const load = async () => {
    setLoading(true); setError('')
    try { setItems(await getCommercialExceptions()) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load exception requests.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const counts = useMemo(() => ({ ALL: items.length, PENDING: items.filter((item) => item.status === 'PENDING').length, APPROVED: items.filter((item) => item.status === 'APPROVED').length, REJECTED: items.filter((item) => item.status === 'REJECTED').length }), [items])
  const visibleItems = filter === 'ALL' ? items : items.filter((item) => item.status === filter)
  const openReview = (item: CommercialException, nextAction: 'approve' | 'reject') => { setSelected(item); setAction(nextAction); setComments(''); setError('') }
  const submit = async () => {
    if (!selected || !comments.trim()) return
    setBusy(true); setError('')
    try { await reviewCommercialException(selected.id, action, comments.trim()); setSelected(null); setComments(''); await load() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to review this exception.') }
    finally { setBusy(false) }
  }

  return <Box sx={{ maxWidth: 1480, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}><GavelRounded /></Box><Box><Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-.025em' }}>Commercial Exception Approvals</Typography><Typography color="text.secondary" sx={{ mt: .25 }}>Executive oversight for opportunities outside normal financial criteria.</Typography></Box></Stack>
      <Button variant="outlined" startIcon={<RefreshRounded />} disabled={loading} onClick={() => void load()} sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>Refresh</Button>
    </Stack>

    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      {([['Pending review', counts.PENDING, <PendingActionsRounded color="warning" />], ['Approved', counts.APPROVED, <CheckCircleOutlineRounded color="success" />], ['Total requests', counts.ALL, <RequestQuoteOutlined color="primary" />]] as const).map(([label, value, icon]) => <Card key={label} variant="outlined" sx={{ flex: 1, p: 2, boxShadow: '0 4px 18px rgba(15,35,70,.04)' }}><Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}><Box><Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 650 }}>{label}</Typography><Typography variant="h4" sx={{ mt: .3, fontWeight: 800 }}>{value}</Typography></Box>{icon}</Stack></Card>)}
    </Stack>

    <Card variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}><Tabs value={filter} onChange={(_, value: StatusFilter) => setFilter(value)} variant="scrollable" scrollButtons="auto" sx={{ px: 1.5 }}>{(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => <Tab key={status} value={status} label={`${status === 'ALL' ? 'All requests' : status.charAt(0) + status.slice(1).toLowerCase()} (${counts[status]})`} />)}</Tabs></Card>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {loading ? <Stack sx={{ alignItems: 'center', py: 10 }} spacing={1}><CircularProgress size={32} /><Typography color="text.secondary">Loading approval requests…</Typography></Stack> : !visibleItems.length ? <Card variant="outlined" sx={{ py: 8, textAlign: 'center' }}><CheckCircleOutlineRounded color="success" sx={{ fontSize: 40 }} /><Typography variant="h6" sx={{ mt: 1 }}>No {filter === 'ALL' ? '' : filter.toLowerCase()} requests</Typography><Typography color="text.secondary">There are no commercial exceptions in this view.</Typography></Card> : <Stack spacing={2}>{visibleItems.map((item) => <Card key={item.id} variant="outlined" sx={{ borderColor: item.status === 'PENDING' ? 'warning.light' : 'divider', boxShadow: '0 6px 24px rgba(15,35,70,.055)', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: item.status === 'PENDING' ? 'rgba(237,108,2,.035)' : 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 1.5 }}><Box><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Typography variant="h6" sx={{ fontWeight: 750 }}>{item.lead_name || item.company_name}</Typography><Chip size="small" label={item.status_display} color={statusColor(item.status)} sx={{ fontWeight: 700 }} /></Stack><Typography color="text.secondary" sx={{ mt: .35, fontSize: 13 }}>{item.company_name} · Requested by {item.requested_by_name} · {new Date(item.requested_at).toLocaleString()}</Typography></Box>{item.status === 'PENDING' && <Stack direction="row" spacing={1}><Button variant="outlined" color="error" onClick={() => openReview(item, 'reject')}>Reject</Button><Button variant="contained" color="success" onClick={() => openReview(item, 'approve')}>Approve exception</Button></Stack>}</Stack></Box>
      <Divider />
      <Box sx={{ p: { xs: 2, md: 2.5 } }}><Alert severity="warning" variant="outlined" sx={{ mb: 2.25 }}><strong>Finance outcome:</strong> Not Financially Viable. This submitted evidence remains immutable regardless of the exception decision.</Alert>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 1.25, mb: 2.5 }}>{([['Client budget range', `${money(item.currency, item.client_budget_min)} – ${money(item.currency, item.client_budget_max)}`, <AccountBalanceWalletOutlined />], ['Estimated delivery cost', money(item.currency, item.estimated_delivery_cost), <RequestQuoteOutlined />], ['Budget shortfall', money(item.currency, item.budget_shortfall), <PendingActionsRounded />]] as const).map(([label, value, icon]) => <Box key={label} sx={{ p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>{icon}<Typography sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</Typography></Stack><Typography sx={{ mt: 1, fontSize: 17, fontWeight: 750 }}>{value}</Typography></Box>)}</Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary' }}>Sales Manager justification</Typography><Typography sx={{ mt: .7, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.justification}</Typography>
        {item.supporting_notes && <><Typography sx={{ mt: 2, fontSize: 11.5, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary' }}>Supporting notes</Typography><Typography sx={{ mt: .7, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.supporting_notes}</Typography></>}
        {item.status !== 'PENDING' && <Box sx={{ mt: 2.5, p: 1.75, borderRadius: 2, bgcolor: item.status === 'APPROVED' ? 'rgba(46,125,50,.055)' : 'rgba(211,47,47,.045)', border: '1px solid', borderColor: item.status === 'APPROVED' ? 'success.light' : 'error.light' }}><Typography sx={{ fontWeight: 750 }}>{item.status_display} by {item.reviewed_by_name || 'Executive reviewer'}</Typography><Typography color="text.secondary" sx={{ mt: .35, fontSize: 12 }}>{item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : ''}</Typography>{item.reviewer_comments && <Typography sx={{ mt: 1, lineHeight: 1.6 }}>{item.reviewer_comments}</Typography>}</Box>}
      </Box>
    </Card>)}</Stack>}

    <Dialog open={Boolean(selected)} onClose={() => !busy && setSelected(null)} fullWidth maxWidth="sm"><DialogTitle sx={{ fontWeight: 750 }}>{action === 'approve' ? 'Approve Commercial Exception' : 'Reject Commercial Exception'}</DialogTitle><DialogContent><Alert severity={action === 'approve' ? 'warning' : 'info'} sx={{ mt: .5, mb: 2 }}>{action === 'approve' ? 'Approval permits this opportunity to continue without changing the Not Financially Viable Finance outcome.' : 'Rejection prevents this exception from being used to progress the opportunity.'}</Alert><TextField required autoFocus fullWidth multiline minRows={4} label="Executive reviewer comment" placeholder="Record the evidence and reasoning behind this decision…" value={comments} onChange={(event) => setComments(event.target.value)} helperText="Required for the audit trail." /></DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button disabled={busy} onClick={() => setSelected(null)}>Cancel</Button><Button disabled={busy || !comments.trim()} variant="contained" color={action === 'approve' ? 'success' : 'error'} onClick={() => void submit()}>{busy ? 'Saving…' : action === 'approve' ? 'Approve exception' : 'Reject exception'}</Button></DialogActions></Dialog>
  </Box>
}
