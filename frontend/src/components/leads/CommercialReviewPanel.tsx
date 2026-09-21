import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material'
import { useNavigate } from 'react-router'
import type { FinancialAssessment } from '../../services/financialCrm'
import { getCommercialReview, requestCommercialException, requestFinancialReassessment, reviseCommercialTerms, type CommercialException, type CommercialReview, type CommercialReviewState } from '../../services/financialCrm'
import { getLeadOpportunityDecision, type OpportunityDecisionState } from '../../services/opportunityCrm'
import { formatMoney } from '../../utils/formatMoney'
import { getApprovedCommercialNextStep } from './commercialDecision'

type Props = {
  leadId: number
  finance: FinancialAssessment
  technicalStatus?: string | null
  onRequestTechnical?: () => void
  onReviewTechnical?: () => void
  onChanged?: () => void
}

const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-GB') : '—'

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography><Typography sx={{ mt: .25, whiteSpace: 'pre-wrap' }}>{children || '—'}</Typography></Box>
}

export default function CommercialReviewPanel({ leadId, finance, technicalStatus, onRequestTechnical, onReviewTechnical, onChanged }: Props) {
  const navigate = useNavigate()
  const [state, setState] = useState<CommercialReviewState | null>(null)
  const [opportunity, setOpportunity] = useState<OpportunityDecisionState | null>(null)
  const [mode, setMode] = useState<'revise' | 'exception' | null>(null)
  const [reason, setReason] = useState('')
  const [scope, setScope] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [commercial, decision] = await Promise.all([getCommercialReview(leadId), getLeadOpportunityDecision(leadId)])
    setState(commercial)
    setOpportunity(decision)
  }, [leadId])
  // Loading the persisted workflow state is the external synchronization performed here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  if (!state) return null
  const latest = state.reviews.find((item) => item.financial_assessment === finance.id)
  const exception = state.exceptions.find((item) => item.financial_assessment === finance.id)
  const hasHistory = state.reviews.length > 0 || state.exceptions.length > 0
  if (finance.outcome !== 'FINANCIALLY_UNSUITABLE' && !hasHistory) return null

  const pending = exception?.status === 'PENDING'
  const approved = exception?.status === 'APPROVED'
  const rejected = exception?.status === 'REJECTED'
  const estimatedCost = latest?.estimated_delivery_cost ?? finance.estimated_delivery_cost
  const budgetShortfall = latest?.budget_shortfall ?? null
  const nextStep = approved ? getApprovedCommercialNextStep({ technicalStatus, decision: opportunity?.decision?.decision, hasDeal: Boolean(opportunity?.deal) }) : null
  const currentFinanceFailed = finance.outcome === 'FINANCIALLY_UNSUITABLE'
  const statusColor = !currentFinanceFailed ? 'success' : approved ? 'success' : rejected ? 'error' : 'warning'
  const authorization = !currentFinanceFailed ? 'Normal Workflow Authorized' : approved ? 'Exception Approved' : rejected ? 'Exception Rejected' : pending ? 'Pending Executive Review' : 'Resolution Required'

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await work(); setMode(null); setReason(''); setScope(''); setNotes(''); await refresh(); onChanged?.() }
    catch (value) { setError(value instanceof Error ? value.message : 'Unable to complete this action.') }
    finally { setBusy(false) }
  }

  const runNextStep = () => {
    if (nextStep?.action === 'REQUEST_TECHNICAL') onRequestTechnical?.()
    else if (nextStep?.action === 'REVIEW_TECHNICAL') onReviewTechnical?.()
    else if (nextStep?.action === 'OPPORTUNITY_DECISION' || nextStep?.action === 'CONVERT_DEAL') navigate('/opportunity-review')
  }

  return <>
    <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderColor: `${statusColor}.main`, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Box><Typography variant="h6">Commercial Decision</Typography><Typography color="text.secondary">Permanent Finance and management authorization record for this opportunity.</Typography></Box>
        <Chip color={statusColor} label={!currentFinanceFailed ? 'Commercial Review Resolved' : pending ? 'Executive Approval Pending' : approved ? 'Commercial Exception Approved' : rejected ? 'Commercial Exception Rejected' : 'Commercial Review Required'} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 4, mt: 2.5 }}>
        <Box sx={{ flex: 1, p: 2, bgcolor: currentFinanceFailed ? 'error.50' : 'success.50', border: '1px solid', borderColor: currentFinanceFailed ? 'error.light' : 'success.light', borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>FINANCE RESULT</Typography><Typography color={currentFinanceFailed ? 'error.main' : 'success.main'} sx={{ mt: .5, fontWeight: 800 }}>{currentFinanceFailed ? 'Not Financially Viable' : 'Financially Viable'}</Typography><Typography color="text.secondary" sx={{ mt: .5, fontSize: 12 }}>Financial Assessment #{finance.id} remains unchanged.</Typography></Box>
        <Box sx={{ flex: 1, p: 2, bgcolor: `${statusColor}.50`, border: '1px solid', borderColor: `${statusColor}.light`, borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>COMMERCIAL AUTHORIZATION</Typography><Typography color={`${statusColor}.main`} sx={{ mt: .5, fontWeight: 800 }}>{authorization}</Typography></Box>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mt: 2.5 }}>
        <Detail label="CLIENT BUDGET">{formatMoney(finance.lead_budget_currency, finance.lead_budget_min)} – {formatMoney(finance.lead_budget_currency, finance.lead_budget_max)}</Detail>
        <Detail label="ESTIMATED DELIVERY COST">{formatMoney(finance.lead_budget_currency, estimatedCost)}</Detail>
        <Detail label="BUDGET SHORTFALL">{formatMoney(finance.lead_budget_currency, budgetShortfall)}</Detail>
        <Detail label="ASSESSED BY">{finance.assigned_to_name}</Detail>
      </Box>

      {exception && <><Divider sx={{ my: 2.5 }} /><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
        <Detail label="REQUESTED BY">{exception.requested_by_name}</Detail><Detail label="REQUESTED">{formatDate(exception.requested_at)}</Detail>
        <Detail label="EXECUTIVE REVIEWER">{exception.reviewed_by_name}</Detail><Detail label="REVIEWED">{formatDate(exception.reviewed_at)}</Detail>
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}><Detail label="SALES MANAGER JUSTIFICATION">{exception.justification}</Detail></Box>
        {exception.supporting_notes && <Box sx={{ gridColumn: { sm: '1 / -1' } }}><Detail label="SUPPORTING NOTES">{exception.supporting_notes}</Detail></Box>}
        {exception.reviewer_comments && <Box sx={{ gridColumn: { sm: '1 / -1' }, p: 2, bgcolor: `${statusColor}.50`, borderRadius: 1.5 }}><Detail label="EXECUTIVE COMMENT">{exception.reviewer_comments}</Detail></Box>}
      </Box></>}

      {pending && <Alert severity="warning" sx={{ mt: 2.5 }}>An Executive review is currently pending. Wait for the Executive decision before starting another commercial resolution action.</Alert>}
      {approved && <Alert severity="success" sx={{ mt: 2.5 }}>Approval authorises this opportunity to continue despite the original Not Financially Viable Finance outcome. The original Finance assessment remains unchanged.</Alert>}
      {rejected && <Alert severity="error" sx={{ mt: 2.5 }}>The opportunity is not authorised to continue under the current commercial terms.</Alert>}

      {approved && nextStep && <Box sx={{ mt: 2.5, p: 2, bgcolor: 'success.50', borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>NEXT STEP</Typography><Typography sx={{ mt: .4, fontWeight: 750 }}>{nextStep.label}</Typography>{nextStep.action && <Button variant="contained" color="success" sx={{ mt: 1.5 }} onClick={runNextStep}>{nextStep.label}</Button>}</Box>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {currentFinanceFailed && !pending && !approved && <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
        <Button variant="outlined" onClick={() => setMode('revise')}>Revise Commercial Terms</Button>
        <Button variant="outlined" disabled={latest?.status !== 'REVISED' || busy} onClick={() => void run(() => requestFinancialReassessment(leadId))}>Request Financial Reassessment</Button>
        {!rejected && <Button variant="outlined" onClick={() => setMode('exception')}>Request Commercial Exception</Button>}
        {rejected && <Button variant="outlined" color="error" onClick={() => navigate('/opportunity-review')}>Do Not Proceed</Button>}
      </Stack>}

      {(state.exceptions.some((item) => item.id !== exception?.id) || state.reviews.some((item) => item.id !== latest?.id)) && <Box component="details" sx={{ mt: 2.5 }}><Typography component="summary" sx={{ cursor: 'pointer', fontWeight: 700 }}>Commercial history</Typography><Stack spacing={1} sx={{ mt: 1.5 }}>
        {state.exceptions.filter((item) => item.id !== exception?.id).map((item: CommercialException) => <Box key={`exception-${item.id}`} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography sx={{ fontWeight: 700 }}>Commercial Exception: {item.status_display} · Financial Assessment #{item.financial_assessment}</Typography><Typography color="text.secondary" sx={{ fontSize: 12 }}>{formatDate(item.reviewed_at || item.requested_at)} · {item.reviewed_by_name || item.requested_by_name}</Typography>{item.reviewer_comments && <Typography sx={{ mt: .5, fontSize: 13 }}>{item.reviewer_comments}</Typography>}</Box>)}
        {state.reviews.filter((item) => item.id !== latest?.id).map((item: CommercialReview) => <Box key={`review-${item.id}`} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography sx={{ fontWeight: 700 }}>Commercial Review: {item.status_display} · Financial Assessment #{item.financial_assessment}</Typography><Typography color="text.secondary" sx={{ fontSize: 12 }}>{formatDate(item.created_at)} · {item.created_by_name}</Typography>{item.reason && <Typography sx={{ mt: .5, fontSize: 13 }}>{item.reason}</Typography>}</Box>)}
      </Stack></Box>}
    </Card>

    <Dialog open={mode !== null} onClose={() => setMode(null)} fullWidth maxWidth="sm"><DialogTitle>{mode === 'revise' ? 'Revise Commercial Terms' : 'Request Commercial Exception'}</DialogTitle><DialogContent><Stack sx={{ gap: 2, pt: 1 }}><Alert severity="warning">Financial Assessment #{finance.id}: Not Financially Viable (read-only)</Alert><TextField label={mode === 'revise' ? 'Reason for Revision' : 'Exception Justification'} required multiline minRows={3} value={reason} onChange={(event) => setReason(event.target.value)} />{mode === 'revise' && <TextField label="Revised Scope / Commercial Terms" required multiline minRows={5} value={scope} onChange={(event) => setScope(event.target.value)} />}<TextField label="Additional / Supporting Notes" multiline minRows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></Stack></DialogContent><DialogActions><Button onClick={() => setMode(null)}>Cancel</Button><Button variant="contained" disabled={busy || !reason.trim() || (mode === 'revise' && !scope.trim())} onClick={() => void run(() => mode === 'revise' ? reviseCommercialTerms(leadId, { reason, revised_scope: scope, notes }) : requestCommercialException(leadId, reason, notes))}>{mode === 'revise' ? 'Save Revision' : 'Request Approval'}</Button></DialogActions></Dialog>
  </>
}
