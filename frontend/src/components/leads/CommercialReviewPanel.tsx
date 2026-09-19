import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import type { FinancialAssessment } from '../../services/financialCrm'
import { getCommercialReview, requestCommercialException, requestFinancialReassessment, reviseCommercialTerms, type CommercialReviewState } from '../../services/financialCrm'
import { formatMoney } from '../../utils/formatMoney'

type Props = { leadId: number; finance: FinancialAssessment; onChanged?: () => void }

export default function CommercialReviewPanel({ leadId, finance, onChanged }: Props) {
  const [state, setState] = useState<CommercialReviewState | null>(null)
  const [mode, setMode] = useState<'revise' | 'exception' | null>(null)
  const [reason, setReason] = useState('')
  const [scope, setScope] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = async () => setState(await getCommercialReview(leadId))
  useEffect(() => { void getCommercialReview(leadId).then(setState).catch(() => undefined) }, [leadId])
  if (finance.outcome !== 'FINANCIALLY_UNSUITABLE') return null
  const latest = state?.reviews[0]
  const exception = state?.exceptions[0]
  const estimatedCost = latest?.estimated_delivery_cost ?? finance.estimated_delivery_cost
  const budgetShortfall = latest?.budget_shortfall ?? null
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await work(); setMode(null); await refresh(); onChanged?.() } catch (value) { setError(value instanceof Error ? value.message : 'Unable to complete this action.') } finally { setBusy(false) }
  }
  return <>
    <Card variant="outlined" sx={{ p: 2.5, borderColor: 'warning.main', bgcolor: 'warning.50' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Box><Typography variant="h6">Financial Review Required</Typography><Typography color="text.secondary">This opportunity was assessed as not financially viable under the current scope and commercial terms.</Typography></Box>
        <Chip color="warning" label="Commercial Review Required" />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3, mt: 2 }}>
        <Box><Typography variant="caption">CLIENT BUDGET</Typography><Typography>{formatMoney(finance.lead_budget_currency, finance.lead_budget_min)} – {formatMoney(finance.lead_budget_currency, finance.lead_budget_max)}</Typography></Box>
        <Box><Typography variant="caption">FINANCIAL OUTCOME</Typography><Typography color="error.main" sx={{ fontWeight: 700 }}>Not Financially Viable</Typography></Box>
        <Box><Typography variant="caption">ESTIMATED DELIVERY COST</Typography><Typography>{formatMoney(finance.lead_budget_currency, estimatedCost)}</Typography></Box>
        <Box><Typography variant="caption">BUDGET SHORTFALL</Typography><Typography>{formatMoney(finance.lead_budget_currency, budgetShortfall)}</Typography></Box>
        <Box><Typography variant="caption">ASSESSED BY</Typography><Typography>{finance.assigned_to_name}</Typography></Box>
      </Stack>
      {latest?.status === 'REVISED' && <Alert severity="info" sx={{ mt: 2 }}>Commercial terms have been revised. A new Financial Assessment can now be requested.</Alert>}
      {latest?.status === 'REASSESSMENT_REQUESTED' && <Alert severity="info" sx={{ mt: 2 }}>Financial reassessment requested. Assessment #{finance.id} remains preserved.</Alert>}
      {exception && <Alert severity={exception.status === 'APPROVED' ? 'success' : exception.status === 'REJECTED' ? 'error' : 'warning'} sx={{ mt: 2 }}>Commercial exception: {exception.status_display}. Finance outcome remains unchanged.</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 2 }}>
        <Button variant="outlined" onClick={() => setMode('revise')}>Revise Scope / Commercial Terms</Button>
        <Button variant="outlined" disabled={latest?.status !== 'REVISED' || busy} onClick={() => void run(() => requestFinancialReassessment(leadId))}>Request Financial Reassessment</Button>
        <Button variant="outlined" disabled={exception?.status === 'PENDING'} onClick={() => setMode('exception')}>Request Exception Approval</Button>
      </Stack>
    </Card>
    <Dialog open={mode !== null} onClose={() => setMode(null)} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'revise' ? 'Revise Scope / Commercial Terms' : 'Request Commercial Exception'}</DialogTitle>
      <DialogContent><Stack sx={{ gap: 2, pt: 1 }}>
        <Alert severity="warning">Financial Assessment #{finance.id}: Not Financially Viable (read-only)</Alert>
        <TextField label={mode === 'revise' ? 'Reason for Revision' : 'Exception Justification'} required multiline minRows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        {mode === 'revise' && <TextField label="Revised Scope / Commercial Terms" required multiline minRows={5} value={scope} onChange={(e) => setScope(e.target.value)} />}
        <TextField label="Additional / Supporting Notes" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setMode(null)}>Cancel</Button><Button variant="contained" disabled={busy || !reason.trim() || (mode === 'revise' && !scope.trim())} onClick={() => void run(() => mode === 'revise' ? reviseCommercialTerms(leadId, { reason, revised_scope: scope, notes }) : requestCommercialException(leadId, reason, notes))}>{mode === 'revise' ? 'Save Revision' : 'Request Approval'}</Button></DialogActions>
    </Dialog>
  </>
}
