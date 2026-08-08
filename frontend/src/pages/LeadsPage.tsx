import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
import {
  AddRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material'
import { useNavigate } from 'react-router'

import {
  hasRequiredRole,
  type UserRole,
} from '../auth/roles'
import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'
import {
  createLead,
  getLeads,
  type Lead,
  type LeadStatus,
} from '../services/crm'

type LeadView = 'ACTIVE' | 'CLOSED' | 'ALL'

const activeStatuses: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'FOLLOW_UP_REQUIRED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
]

const closedStatuses: LeadStatus[] = [
  'CONVERTED',
  'LOST',
]

const leadCreatorRoles: UserRole[] = [
  'ADMIN',
  'MARKETING',
  'SALES_MANAGER',
  'PROJECT_MANAGER',
]

function LeadsPage() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [leads, setLeads] = useState<Lead[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [search, setSearch] = useState('')
  const [leadView, setLeadView] =
    useState<LeadView>('ACTIVE')

  const [statusFilter, setStatusFilter] =
    useState<LeadStatus | 'ALL'>('ALL')

  const [addDialogOpen, setAddDialogOpen] =
    useState(false)

  const [form, setForm] = useState({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    source: '',
  })

  const loadPageData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const [user, leadData] = await Promise.all([
        getCurrentUser(),
        getLeads(),
      ])

      setCurrentUser(user)
      setLeads(leadData)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load leads.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      try {
        const [user, leadData] = await Promise.all([
          getCurrentUser(),
          getLeads(),
        ])

        if (!isMounted) {
          return
        }

        setCurrentUser(user)
        setLeads(leadData)
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load leads.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  const isSalesRepresentative =
    currentUser?.role === 'SALES_REP'

  const canCreateLead =
    currentUser !== null &&
    hasRequiredRole(
      currentUser.role,
      leadCreatorRoles,
    )

  const activeLeadCount = useMemo(
    () =>
      leads.filter((lead) =>
        activeStatuses.includes(lead.status),
      ).length,
    [leads],
  )

  const closedLeadCount = useMemo(
    () =>
      leads.filter((lead) =>
        closedStatuses.includes(lead.status),
      ).length,
    [leads],
  )

  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim()

    return leads.filter((lead) => {
      const matchesSearch =
        lead.contact_name
          .toLowerCase()
          .includes(query) ||
        lead.company_name
          .toLowerCase()
          .includes(query) ||
        lead.email
          .toLowerCase()
          .includes(query) ||
        lead.phone
          .toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === 'ALL' ||
        lead.status === statusFilter

      const matchesLeadView =
        leadView === 'ALL' ||
        (leadView === 'ACTIVE' &&
          activeStatuses.includes(lead.status)) ||
        (leadView === 'CLOSED' &&
          closedStatuses.includes(lead.status))

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLeadView
      )
    })
  }, [
    leads,
    search,
    statusFilter,
    leadView,
  ])

  const handleLeadViewChange = (
    view: LeadView,
  ) => {
    setLeadView(view)
    setStatusFilter('ALL')
  }

  const resetCreateForm = () => {
    setForm({
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      source: '',
    })
  }

  const handleAddLead = async () => {
    if (!canCreateLead) {
      return
    }

    if (
      !form.contactName.trim() ||
      !form.companyName.trim() ||
      !form.phone.trim()
    ) {
      return
    }

    setIsCreating(true)
    setError('')
    setSuccessMessage('')

    try {
      const createdLead = await createLead({
        contact_name: form.contactName.trim(),
        company_name: form.companyName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        source: form.source.trim(),
      })

      setLeads((currentLeads) => [
        createdLead,
        ...currentLeads,
      ])

      resetCreateForm()
      setLeadView('ACTIVE')
      setStatusFilter('ALL')
      setAddDialogOpen(false)

      setSuccessMessage(
        `${createdLead.contact_name} was added successfully.`,
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create the lead.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusLabel = (
    status: LeadStatus,
  ) =>
    status
      .split('_')
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase(),
      )
      .join(' ')

  const getStatusColor = (
    status: LeadStatus,
  ):
    | 'default'
    | 'info'
    | 'warning'
    | 'success'
    | 'error' => {
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

  const formatDate = (
    dateValue: string | null,
  ) => {
    if (!dateValue) {
      return '—'
    }

    return new Date(
      dateValue,
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getEmptyMessage = () => {
    if (isSalesRepresentative) {
      if (leadView === 'ACTIVE') {
        return 'No active leads assigned to you'
      }

      if (leadView === 'CLOSED') {
        return 'No closed leads assigned to you'
      }

      return 'No leads assigned to you'
    }

    if (leadView === 'ACTIVE') {
      return 'No active leads found'
    }

    if (leadView === 'CLOSED') {
      return 'No closed leads found'
    }

    return 'No leads found'
  }

  const pageTitle = isSalesRepresentative
    ? 'My Leads'
    : 'Leads'

  const pageDescription =
    isSalesRepresentative
      ? 'View and manage leads assigned to you.'
      : 'Manage and track Altrium’s potential customers.'

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
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
          <Typography
            variant="h4"
            sx={{ fontWeight: 800 }}
          >
            {pageTitle}
          </Typography>

          <Typography
            sx={{
              color: 'text.secondary',
            }}
          >
            {pageDescription}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshRounded />}
            onClick={() =>
              void loadPageData()
            }
            disabled={isLoading}
          >
            Refresh
          </Button>

          {canCreateLead && (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => {
                setError('')
                setSuccessMessage('')
                setAddDialogOpen(true)
              }}
            >
              Add Lead
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() =>
            setSuccessMessage('')
          }
        >
          {successMessage}
        </Alert>
      )}

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Card
          variant="outlined"
          sx={{ flex: 1, p: 2 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {isSalesRepresentative
              ? 'My active leads'
              : 'Active leads'}
          </Typography>

          <Typography
            variant="h5"
            sx={{ fontWeight: 800 }}
          >
            {activeLeadCount}
          </Typography>
        </Card>

        <Card
          variant="outlined"
          sx={{ flex: 1, p: 2 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {isSalesRepresentative
              ? 'My closed leads'
              : 'Closed leads'}
          </Typography>

          <Typography
            variant="h5"
            sx={{ fontWeight: 800 }}
          >
            {closedLeadCount}
          </Typography>
        </Card>

        <Card
          variant="outlined"
          sx={{ flex: 1, p: 2 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {isSalesRepresentative
              ? 'My total leads'
              : 'Total leads'}
          </Typography>

          <Typography
            variant="h5"
            sx={{ fontWeight: 800 }}
          >
            {leads.length}
          </Typography>
        </Card>
      </Stack>

      <Card
        variant="outlined"
        sx={{ mb: 3, p: 2 }}
      >
        <Stack
          direction={{
            xs: 'column',
            lg: 'row',
          }}
          spacing={2}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, company, email or phone"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
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

          <FormControl
            size="small"
            sx={{ minWidth: 180 }}
          >
            <InputLabel>
              Lead view
            </InputLabel>

            <Select
              value={leadView}
              label="Lead view"
              onChange={(event) =>
                handleLeadViewChange(
                  event.target.value as LeadView,
                )
              }
            >
              <MenuItem value="ACTIVE">
                Active ({activeLeadCount})
              </MenuItem>

              <MenuItem value="CLOSED">
                Closed ({closedLeadCount})
              </MenuItem>

              <MenuItem value="ALL">
                All ({leads.length})
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{ minWidth: 220 }}
          >
            <InputLabel>Status</InputLabel>

            <Select
              value={statusFilter}
              label="Status"
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | LeadStatus
                    | 'ALL',
                )
              }
            >
              <MenuItem value="ALL">
                All statuses
              </MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="CONTACTED">
                Contacted
              </MenuItem>
              <MenuItem value="FOLLOW_UP_REQUIRED">
                Follow-up Required
              </MenuItem>
              <MenuItem value="QUALIFIED">
                Qualified
              </MenuItem>
              <MenuItem value="PROPOSAL_SENT">
                Proposal Sent
              </MenuItem>
              <MenuItem value="NEGOTIATION">
                Negotiation
              </MenuItem>
              <MenuItem value="CONVERTED">
                Converted
              </MenuItem>
              <MenuItem value="LOST">Lost</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Card>

      <TableContainer
        component={Card}
        variant="outlined"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lead</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Source</TableCell>

              {!isSalesRepresentative && (
                <TableCell>
                  Assigned to
                </TableCell>
              )}

              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={
                    isSalesRepresentative
                      ? 6
                      : 7
                  }
                  align="center"
                  sx={{ py: 7 }}
                >
                  <CircularProgress size={32} />

                  <Typography
                    sx={{
                      mt: 2,
                      color: 'text.secondary',
                    }}
                  >
                    Loading leads...
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  hover
                  onClick={() =>
                    navigate(`/leads/${lead.id}`)
                  }
                  sx={{
                    cursor: 'pointer',
                  }}
                >
                  <TableCell>
                    <Typography
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      {lead.contact_name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {lead.email || 'No email'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {lead.company_name}
                  </TableCell>

                  <TableCell>
                    {lead.phone}
                  </TableCell>

                  <TableCell>
                    {lead.source || '—'}
                  </TableCell>

                  {!isSalesRepresentative && (
                    <TableCell>
                      {lead.assigned_to_name ||
                        'Unassigned'}
                    </TableCell>
                  )}

                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        lead.status_display ||
                        getStatusLabel(
                          lead.status,
                        )
                      }
                      color={getStatusColor(
                        lead.status,
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    {formatDate(
                      lead.created_at,
                    )}
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading &&
              filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={
                      isSalesRepresentative
                        ? 6
                        : 7
                    }
                    align="center"
                    sx={{ py: 7 }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                      }}
                    >
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

      {canCreateLead && (
        <Dialog
          open={addDialogOpen}
          onClose={() => {
            if (!isCreating) {
              setAddDialogOpen(false)
            }
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Add New Lead
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                required
                label="Contact name"
                value={form.contactName}
                onChange={(event) =>
                  setForm({
                    ...form,
                    contactName:
                      event.target.value,
                  })
                }
              />

              <TextField
                required
                label="Company"
                value={form.companyName}
                onChange={(event) =>
                  setForm({
                    ...form,
                    companyName:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="Email address"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email:
                      event.target.value,
                  })
                }
              />

              <TextField
                required
                label="Phone number"
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="Lead source"
                placeholder="Website, Referral, Campaign..."
                value={form.source}
                onChange={(event) =>
                  setForm({
                    ...form,
                    source:
                      event.target.value,
                  })
                }
              />

              <Alert severity="info">
                New leads are created
                unassigned. Sales Managers
                or Project Managers can
                assign them to a Sales
                Representative.
              </Alert>
            </Stack>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              pb: 3,
            }}
          >
            <Button
              onClick={() =>
                setAddDialogOpen(false)
              }
              disabled={isCreating}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleAddLead()
              }
              disabled={
                isCreating ||
                !form.contactName.trim() ||
                !form.companyName.trim() ||
                !form.phone.trim()
              }
            >
              {isCreating ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'Save Lead'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

export default LeadsPage