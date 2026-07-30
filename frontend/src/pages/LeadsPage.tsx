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

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'REJECTED'

type Lead = {
  id: number
  name: string
  company: string
  email: string
  source: string
  status: LeadStatus
  assignedTo: string
  createdAt: string
}

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
  },
  {
    id: 2,
    name: 'Dinithi Silva',
    company: 'Vertex Holdings',
    email: 'dinithi@vertex.lk',
    source: 'Referral',
    status: 'CONTACTED',
    assignedTo: 'Nuwan Perera',
    createdAt: '29 Jul 2026',
  },
  {
    id: 3,
    name: 'Kasun Jayawardena',
    company: 'Peak Digital',
    email: 'kasun@peakdigital.lk',
    source: 'Campaign',
    status: 'QUALIFIED',
    assignedTo: 'Kasun Fernando',
    createdAt: '28 Jul 2026',
  },
]

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    source: '',
    assignedTo: '',
  })

  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim()

    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(query) ||
        lead.company.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'ALL' || lead.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [leads, search, statusFilter])

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
    }

    setLeads((currentLeads) => [newLead, ...currentLeads])
    setForm({
      name: '',
      company: '',
      email: '',
      source: '',
      assignedTo: '',
    })
    setDialogOpen(false)
  }

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'QUALIFIED':
        return 'success'
      case 'CONTACTED':
        return 'info'
      case 'REJECTED':
        return 'error'
      default:
        return 'warning'
    }
  }

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
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
          onClick={() => setDialogOpen(true)}
        >
          Add Lead
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Status</InputLabel>

            <Select
              value={statusFilter}
              label="Status"
              onChange={(event) =>
                setStatusFilter(event.target.value as LeadStatus | 'ALL')
              }
            >
              <MenuItem value="ALL">All statuses</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="CONTACTED">Contacted</MenuItem>
              <MenuItem value="QUALIFIED">Qualified</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
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
              <TableRow key={lead.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>
                    {lead.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {lead.email}
                  </Typography>
                </TableCell>

                <TableCell>{lead.company}</TableCell>
                <TableCell>{lead.source}</TableCell>
                <TableCell>{lead.assignedTo}</TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={lead.status.replace('_', ' ')}
                    color={getStatusColor(lead.status)}
                  />
                </TableCell>

                <TableCell>{lead.createdAt}</TableCell>
              </TableRow>
            ))}

            {filteredLeads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    No leads found
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Try changing your search or status filter.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
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
                setForm({ ...form, name: event.target.value })
              }
            />

            <TextField
              label="Company"
              value={form.company}
              onChange={(event) =>
                setForm({ ...form, company: event.target.value })
              }
            />

            <TextField
              required
              type="email"
              label="Email address"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />

            <TextField
              label="Lead source"
              value={form.source}
              onChange={(event) =>
                setForm({ ...form, source: event.target.value })
              }
            />

            <TextField
              label="Assigned sales representative"
              value={form.assignedTo}
              onChange={(event) =>
                setForm({ ...form, assignedTo: event.target.value })
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>

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