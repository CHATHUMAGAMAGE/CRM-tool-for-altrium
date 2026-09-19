import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { getCommercialExceptions, reviewCommercialException, type CommercialException } from '../services/financialCrm'

export default function CommercialExceptionsPage() {
  const [items, setItems] = useState<CommercialException[]>([])
  const [selected, setSelected] = useState<CommercialException | null>(null)
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')
  const load = async () => setItems(await getCommercialExceptions())
  useEffect(() => { void getCommercialExceptions().then(setItems).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load exceptions.')) }, [])
  const submit = async () => {
    if (!selected) return
    try { await reviewCommercialException(selected.id, action, comments); setSelected(null); setComments(''); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to review exception.') }
  }
  return <Box sx={{ p: { xs: 2, md: 3 } }}>
    <Typography variant="h4" sx={{ fontWeight: 750 }}>Commercial Exception Review</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Authorised review of requests to proceed outside normal financial criteria.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Stack sx={{ gap: 2 }}>{items.map((item) => <Card key={item.id} variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Box><Typography variant="h6">{item.lead_name || item.company_name}</Typography><Typography color="text.secondary">{item.company_name} · Requested by {item.requested_by_name}</Typography></Box>
        <Chip label={item.status_display} color={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'error' : 'warning'} />
      </Stack>
      <Alert severity="error" variant="outlined" sx={{ my: 2 }}>Finance outcome: Not Financially Viable (immutable)</Alert>
      <Typography variant="subtitle2">Exception justification</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.justification}</Typography>
      {item.status === 'PENDING' && <Stack direction="row" sx={{ gap: 1, mt: 2 }}><Button variant="contained" color="success" onClick={() => { setSelected(item); setAction('approve') }}>Approve</Button><Button variant="outlined" color="error" onClick={() => { setSelected(item); setAction('reject') }}>Reject</Button></Stack>}
    </Card>)}</Stack>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm"><DialogTitle>{action === 'approve' ? 'Approve' : 'Reject'} Commercial Exception</DialogTitle><DialogContent><TextField sx={{ mt: 1 }} fullWidth multiline minRows={4} label="Reviewer Comments" value={comments} onChange={(e) => setComments(e.target.value)} /></DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Cancel</Button><Button variant="contained" color={action === 'approve' ? 'success' : 'error'} onClick={() => void submit()}>{action === 'approve' ? 'Approve Exception' : 'Reject Exception'}</Button></DialogActions></Dialog>
  </Box>
}
