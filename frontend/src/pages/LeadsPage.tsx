import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { AddRounded, SearchRounded } from '@mui/icons-material'

type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'CONVERTED'
  | 'LOST'

type LeadView = 'ACTIVE' | 'CLOSED' | 'ALL'

type Lead = {
  id: number
  name: string
  company: string
  email: string
  source: string
  status: LeadStatus
  assignedTo: string
  createdAt: string
  lostReason: string
}

const activeStatuses: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'FOLLOW_UP_REQUIRED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
]

const closedStatuses: LeadStatus[] = ['CONVERTED', 'LOST']

const initialLeads: Lead[] = [
  {
    id: 1,
    name: 'Amal Perera',
    company: 'Nova Solutions',
    email: 'amal@novasolutions.lk',
    source: 'Website',
    status: 'NEW',
    assignedTo: 'Nuwan Perera',
    createdAt: '30 Jul 2026',
    lostReason: '',
  },
  {
    id: 2,
    name: 'Dinithi Silva',
    company: 'Vertex Holdings',
    email: 'dinithi@vertex.lk',
    source: 'Referral',
    status: 'FOLLOW_UP_REQUIRED',
    assignedTo: 'Nuwan Perera',
    createdAt: '29 Jul 2026',
    lostReason: '',
  },
  {
    id: 3,
    name: 'Kasun Jayawardena',
    company: 'Peak Digital',
    email: 'kasun@peakdigital.lk',
    source: 'Campaign',
    status: 'PROPOSAL_SENT',
    assignedTo: 'Kasun Fernando',
    createdAt: '28 Jul 2026',
    lostReason: '',
  },
  {
    id: 4,
    name: 'Tharushi Fernando',
    company: 'Lanka Commerce',
    email: 'tharushi@lankacommerce.lk',
    source: 'Referral',
    status: 'CONVERTED',
    assignedTo: 'Kasun Fernando',
    createdAt: '24 Jul 2026',
    lostReason: '',
  },
  {
    id: 5,
    name: 'Nimal Silva',
    company: 'Brightway Solutions',
    email: 'nimal@brightway.lk',
    source: 'Website',
    status: 'LOST',
    assignedTo: 'Nuwan Perera',
    createdAt: '21 Jul 2026',
    lostReason: 'Customer selected another service provider.',
  },
]

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [leadView, setLeadView] = useState<LeadView>('ACTIVE')
  const [statusFilter, setStatusFilter] =
    useState<LeadStatus | 'ALL'>('ALL')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const [draftStatus, setDraftStatus] = useState<LeadStatus>('NEW')
  const [lostReason, setLostReason] = useState('')
  const [lostReasonError, setLostReasonError] = useState(false)

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    source: '',
    assignedTo: '',
  })

  const activeLeadCount = useMemo(
    () =>
      leads.filter((lead) => activeStatuses.includes(lead.status))
        .length,
    [leads],
  )

  const closedLeadCount = useMemo(
    () =>
      leads.filter((lead) => closedStatuses.includes(lead.status))
        .length,
    [leads],
  )

  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim()

    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'ALL' || lead.status === statusFilter

      const matchesLeadView =
        leadView === 'ALL' ||
        (leadView === 'ACTIVE' &&
          activeStatuses.includes(lead.status)) ||
        (leadView === 'CLOSED' &&
          closedStatuses.includes(lead.status))

      return matchesSearch && matchesStatus && matchesLeadView
    })
  }, [leads, search, statusFilter, leadView])

  const handleLeadViewChange = (view: LeadView) => {
    setLeadView(view)
    setStatusFilter('ALL')
  }

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead)
    setDraftStatus(lead.status)
    setLostReason(lead.lostReason)
    setLostReasonError(false)
  }

  const handleCloseLead = () => {
    setSelectedLead(null)
    setLostReasonError(false)
  }

  const handleAddLead = () => {
    if (!form.name.trim() || !form.email.trim()) {
      return
    }

    const newLead: Lead = {
      id: Date.now(),
      name: form.name.trim(),
      company: form.company.trim() || 'Not provided',
      email: form.email.trim(),
      source: form.source.trim() || 'Manual',
      assignedTo: form.assignedTo.trim() || 'Unassigned',
      status: 'NEW',
      createdAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      lostReason: '',
    }

    setLeads((currentLeads) => [newLead, ...currentLeads])

    setForm({
      name: '',
      company: '',
      email: '',
      source: '',
      assignedTo: '',
    })

    setLeadView('ACTIVE')
    setStatusFilter('ALL')
    setAddDialogOpen(false)
  }

  const handleSaveLeadChanges = () => {
    if (!selectedLead) {
      return
    }

    if (draftStatus === 'LOST' && !lostReason.trim()) {
      setLostReasonError(true)
      return
    }

    const updatedLead: Lead = {
      ...selectedLead,
      status: draftStatus,
      lostReason: draftStatus === 'LOST' ? lostReason.trim() : '',
    }

    setLeads((currentLeads) =>
      currentLeads.map((lead) =>
        lead.id === selectedLead.id ? updatedLead : lead,
      ),
    )

    handleCloseLead()
  }

  const getStatusLabel = (status: LeadStatus) =>
    status
      .split('_')
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(' ')

  const getStatusColor = (
    status: LeadStatus,
  ): 'default' | 'info' | 'warning' | 'success' | 'error' => {
    switch (status) {
      case 'CONTACTED':
      case 'PROPOSAL_SENT':
        return 'info'

      case 'FOLLOW_UP_REQUIRED':
      case 'NEGOTIATION':
        return 'warning'

      case 'QUALIFIED':
      case 'CONVERTED':
        return 'success'

      case 'LOST':
        return 'error'

      default:
        return 'default'
    }
  }

  const getEmptyMessage = () => {
    if (leadView === 'ACTIVE') {
      return 'No active leads found'
    }

    if (leadView === 'CLOSED') {
      return 'No closed leads found'
    }

    return 'No leads found'
  }

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Leads
          </Typography>

          <Typography sx={{ color: 'text.secondary' }}>
            Manage and track Altrium&apos;s potential customers.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Lead
        </Button>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Card variant="outlined" sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Active leads
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {activeLeadCount}
          </Typography>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Closed leads
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {closedLeadCount}
          </Typography>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total leads
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {leads.length}
          </Typography>
        </Card>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, company or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Lead view</InputLabel>

            <Select
              value={leadView}
              label="Lead view"
              onChange={(event) =>
                handleLeadViewChange(event.target.value as LeadView)
              }
            >
              <MenuItem value="ACTIVE">
                Active ({activeLeadCount})
              </MenuItem>

              <MenuItem value="CLOSED">
                Closed ({closedLeadCount})
              </MenuItem>

              <MenuItem value="ALL">All ({leads.length})</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Status</InputLabel>

            <Select
              value={statusFilter}
              label="Status"
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as LeadStatus | 'ALL',
                )
              }
            >
              <MenuItem value="ALL">All statuses</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="CONTACTED">Contacted</MenuItem>

              <MenuItem value="FOLLOW_UP_REQUIRED">
                Follow-up Required
              </MenuItem>

              <MenuItem value="QUALIFIED">Qualified</MenuItem>
              <MenuItem value="PROPOSAL_SENT">Proposal Sent</MenuItem>
              <MenuItem value="NEGOTIATION">Negotiation</MenuItem>
              <MenuItem value="CONVERTED">Converted</MenuItem>
              <MenuItem value="LOST">Lost</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Card>

      <TableContainer component={Card} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lead</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Assigned to</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow
                key={lead.id}
                hover
                onClick={() => handleOpenLead(lead)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>
                    {lead.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {lead.email}
                  </Typography>
                </TableCell>

                <TableCell>{lead.company}</TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{lead.assignedTo}</TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={getStatusLabel(lead.status)}
                    color={getStatusColor(lead.status)}
                  />
                </TableCell>

                <TableCell>{lead.createdAt}</TableCell>
              </TableRow>
            ))}

            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <Typography sx={{ fontWeight: 700 }}>
                    {getEmptyMessage()}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Try changing your search or filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(selectedLead)}
        onClose={handleCloseLead}
        fullWidth
        maxWidth="sm"
      >
        {selectedLead && (
          <>
            <DialogTitle>
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {selectedLead.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {selectedLead.company}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={getStatusLabel(draftStatus)}
                  color={getStatusColor(draftStatus)}
                />
              </Stack>
            </DialogTitle>

            <Divider />

            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Email address
                  </Typography>

                  <Typography>{selectedLead.email}</Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Lead source
                  </Typography>

                  <Typography>{selectedLead.source}</Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Assigned sales representative
                  </Typography>

                  <Typography>{selectedLead.assignedTo}</Typography>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Created date
                  </Typography>

                  <Typography>{selectedLead.createdAt}</Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Lead status</InputLabel>

                  <Select
                    value={draftStatus}
                    label="Lead status"
                    onChange={(event) => {
                      const newStatus = event.target.value as LeadStatus

                      setDraftStatus(newStatus)
                      setLostReasonError(false)
                    }}
                  >
                    <MenuItem value="NEW">New</MenuItem>
                    <MenuItem value="CONTACTED">Contacted</MenuItem>

                    <MenuItem value="FOLLOW_UP_REQUIRED">
                      Follow-up Required
                    </MenuItem>

                    <MenuItem value="QUALIFIED">Qualified</MenuItem>

                    <MenuItem value="PROPOSAL_SENT">
                      Proposal Sent
                    </MenuItem>

                    <MenuItem value="NEGOTIATION">
                      Negotiation
                    </MenuItem>

                    <MenuItem value="CONVERTED">Converted</MenuItem>
                    <MenuItem value="LOST">Lost</MenuItem>
                  </Select>
                </FormControl>

                {draftStatus === 'LOST' && (
                  <TextField
                    required
                    multiline
                    minRows={3}
                    label="Reason the lead was lost"
                    value={lostReason}
                    error={lostReasonError}
                    helperText={
                      lostReasonError
                        ? 'A lost reason is required.'
                        : 'Record why this lead was unsuccessful.'
                    }
                    onChange={(event) => {
                      setLostReason(event.target.value)
                      setLostReasonError(false)
                    }}
                  />
                )}

                {closedStatuses.includes(draftStatus) && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Saving this status will move the lead to the
                    Closed Leads view.
                  </Typography>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseLead}>Cancel</Button>

              <Button
                variant="contained"
                onClick={handleSaveLeadChanges}
              >
                Save Changes
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Lead</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              required
              label="Contact name"
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
            />

            <TextField
              label="Company"
              value={form.company}
              onChange={(event) =>
                setForm({
                  ...form,
                  company: event.target.value,
                })
              }
            />

            <TextField
              required
              type="email"
              label="Email address"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
            />

            <TextField
              label="Lead source"
              value={form.source}
              onChange={(event) =>
                setForm({
                  ...form,
                  source: event.target.value,
                })
              }
            />

            <TextField
              label="Assigned sales representative"
              value={form.assignedTo}
              onChange={(event) =>
                setForm({
                  ...form,
                  assignedTo: event.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddDialogOpen(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleAddLead}
            disabled={!form.name.trim() || !form.email.trim()}
          >
            Save Lead
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LeadsPage