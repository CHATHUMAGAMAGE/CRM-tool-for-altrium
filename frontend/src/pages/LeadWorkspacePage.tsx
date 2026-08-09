import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  ArrowBackRounded,
  AssignmentIndRounded,
  BusinessRounded,
  CalendarTodayRounded,
  CallRounded,
  ChatBubbleOutlineRounded,
  CloseRounded,
  EditRounded,
  EventRounded,
  FilterListRounded,
  GroupsRounded,
  MailOutlineRounded,
  MoreVertRounded,
  PersonOutlineRounded,
} from '@mui/icons-material'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'

import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'
import {
  createLeadCommunication,
  createLeadFollowUp,
  getLead,
  getLeadCommunications,
  getLeadFollowUps,
  type Communication,
  type CommunicationType,
  type FollowUp,
  type FollowUpStatus,
  type Lead,
  type LeadStatus,
} from '../services/crm'

type WorkspaceTab =
  | 'overview'
  | 'communications'
  | 'follow-ups'
  | 'activity'
  | 'history'

type CommunicationFilter =
  | 'ALL'
  | CommunicationType

type CommunicationForm = {
  communicationType: CommunicationType
  communicationDate: string
  communicationTime: string
  summary: string
  notes: string
}

type FollowUpForm = {
  title: string
  description: string
  dueDate: string
}

function getStatusColor(
  status: LeadStatus,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
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

function getCommunicationIcon(
  type: CommunicationType,
) {
  switch (type) {
    case 'CALL':
      return <CallRounded fontSize="small" />

    case 'EMAIL':
      return <MailOutlineRounded fontSize="small" />

    case 'MEETING':
      return <GroupsRounded fontSize="small" />

    case 'WHATSAPP':
      return <ChatBubbleOutlineRounded fontSize="small" />

    default:
      return <CallRounded fontSize="small" />
  }
}

function getFollowUpColor(
  followUp: FollowUp,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
  if (followUp.is_overdue) {
    return 'error'
  }

  switch (followUp.status) {
    case 'PENDING':
      return 'info'

    case 'COMPLETED':
      return 'success'

    case 'CANCELLED':
      return 'default'

    default:
      return 'default'
  }
}

function getFollowUpLabel(
  followUp: FollowUp,
) {
  if (followUp.is_overdue) {
    return 'Overdue'
  }

  if (followUp.status === 'PENDING') {
    return 'Upcoming'
  }

  return followUp.status_display
}

function sortFollowUps(
  items: FollowUp[],
) {
  const statusRank: Record<FollowUpStatus, number> = {
    PENDING: 0,
    COMPLETED: 1,
    CANCELLED: 2,
  }

  return [...items].sort((a, b) => {
    const statusDifference =
      statusRank[a.status] -
      statusRank[b.status]

    if (statusDifference !== 0) {
      return statusDifference
    }

    return (
      new Date(a.due_date).getTime() -
      new Date(b.due_date).getTime()
    )
  })
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function getDefaultCommunicationDateParts() {
  const date = new Date(Date.now() - 60_000)
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  )
  const localValue = localDate.toISOString()

  return {
    date: localValue.slice(0, 10),
    time: localValue.slice(11, 16),
  }
}

function createEmptyCommunicationForm(): CommunicationForm {
  const defaultDateTime =
    getDefaultCommunicationDateParts()

  return {
    communicationType: 'CALL',
    communicationDate: defaultDateTime.date,
    communicationTime: defaultDateTime.time,
    summary: '',
    notes: '',
  }
}

function getDefaultFollowUpDateTime() {
  const date = new Date(
    Date.now() + 60 * 60 * 1000,
  )
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  )

  return localDate.toISOString().slice(0, 16)
}

function createEmptyFollowUpForm(): FollowUpForm {
  return {
    title: '',
    description: '',
    dueDate: getDefaultFollowUpDateTime(),
  }
}

function InformationItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.4,
          fontWeight: 600,
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  )
}

function LeadWorkspacePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { leadId } = useParams()

  const [lead, setLead] =
    useState<Lead | null>(null)

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [communications, setCommunications] =
    useState<Communication[]>([])

  const [followUps, setFollowUps] =
    useState<FollowUp[]>([])

  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>(() =>
      searchParams.get('tab') === 'follow-ups'
        ? 'follow-ups'
        : 'overview',
    )

  const [isLoading, setIsLoading] =
    useState(true)

  const [isCreatingCommunication, setIsCreatingCommunication] =
    useState(false)

  const [communicationDialogOpen, setCommunicationDialogOpen] =
    useState(false)

  const [communicationForm, setCommunicationForm] =
    useState<CommunicationForm>(
      createEmptyCommunicationForm,
    )

  const [communicationError, setCommunicationError] =
    useState('')

  const [communicationFilter, setCommunicationFilter] =
    useState<CommunicationFilter>('ALL')

  const [isCreatingFollowUp, setIsCreatingFollowUp] =
    useState(false)

  const [followUpDialogOpen, setFollowUpDialogOpen] =
    useState(false)

  const [followUpForm, setFollowUpForm] =
    useState<FollowUpForm>(
      createEmptyFollowUpForm,
    )

  const [followUpError, setFollowUpError] =
    useState('')

  const [
    followUpSuccessMessage,
    setFollowUpSuccessMessage,
  ] = useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [error, setError] =
    useState('')

  useEffect(() => {
    let isMounted = true

    const loadWorkspace = async () => {
      const numericLeadId = Number(leadId)

      if (
        !leadId ||
        Number.isNaN(numericLeadId)
      ) {
        if (isMounted) {
          setError('Invalid lead identifier.')
          setIsLoading(false)
        }

        return
      }

      try {
        const [
          leadData,
          user,
          communicationData,
          followUpData,
        ] = await Promise.all([
          getLead(numericLeadId),
          getCurrentUser(),
          getLeadCommunications(numericLeadId),
          getLeadFollowUps(numericLeadId),
        ])

        if (!isMounted) {
          return
        }

        setLead(leadData)
        setCurrentUser(user)
        setCommunications(communicationData)
        setFollowUps(
          sortFollowUps(followUpData),
        )
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load this lead.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      isMounted = false
    }
  }, [leadId])

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack
          spacing={2}
          sx={{
            alignItems: 'center',
          }}
        >
          <CircularProgress />

          <Typography color="text.secondary">
            Loading lead workspace...
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (error || !lead) {
    return (
      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error || 'Lead not found.'}
        </Alert>

        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => navigate('/leads')}
        >
          Back to Leads
        </Button>
      </Box>
    )
  }

  const numericLeadId = lead.id

  const isSalesRep =
    currentUser?.role === 'SALES_REP'

  const canWorkLead =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SALES_MANAGER' ||
    currentUser?.role ===
      'PROJECT_MANAGER' ||
    (
      isSalesRep &&
      lead.assigned_to === currentUser?.id
    )

  const isClosedLead =
    lead.status === 'CONVERTED' ||
    lead.status === 'LOST'

  const canAddCommunication =
    canWorkLead && !isClosedLead

  const filteredCommunications =
    communications.filter(
      (communication) =>
        communicationFilter === 'ALL' ||
        communication.communication_type ===
          communicationFilter,
    )

  const canScheduleFollowUp =
    canWorkLead && !isClosedLead

  const openCommunicationDialog = () => {
    if (!canAddCommunication) {
      return
    }

    setCommunicationError('')
    setSuccessMessage('')
    setCommunicationForm(
      createEmptyCommunicationForm(),
    )
    setCommunicationDialogOpen(true)
  }

  const closeCommunicationDialog = () => {
    if (isCreatingCommunication) {
      return
    }

    setCommunicationDialogOpen(false)
    setCommunicationError('')
  }

  const handleCreateCommunication = async () => {
    if (
      !canAddCommunication ||
      !communicationForm.summary.trim() ||
      !communicationForm.communicationDate ||
      !communicationForm.communicationTime
    ) {
      return
    }

    setIsCreatingCommunication(true)
    setCommunicationError('')
    setSuccessMessage('')

    try {
      const createdCommunication =
        await createLeadCommunication(
          numericLeadId,
          {
            communication_type:
              communicationForm.communicationType,
            communication_date: new Date(
              `${communicationForm.communicationDate}T${communicationForm.communicationTime}`,
            ).toISOString(),
            summary:
              communicationForm.summary.trim(),
            notes:
              communicationForm.notes.trim(),
          },
        )

      setCommunications((current) => [
        createdCommunication,
        ...current,
      ])

      setCommunicationDialogOpen(false)
      setCommunicationForm(
        createEmptyCommunicationForm(),
      )
      setActiveTab('communications')
      setSuccessMessage(
        'Communication recorded successfully.',
      )
    } catch (requestError) {
      setCommunicationError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to record the communication.',
      )
    } finally {
      setIsCreatingCommunication(false)
    }
  }


  const openFollowUpDialog = () => {
    if (!canScheduleFollowUp) {
      return
    }

    setFollowUpError('')
    setSuccessMessage('')
    setFollowUpSuccessMessage('')
    setFollowUpForm(
      createEmptyFollowUpForm(),
    )
    setFollowUpDialogOpen(true)
  }

  const closeFollowUpDialog = () => {
    if (isCreatingFollowUp) {
      return
    }

    setFollowUpDialogOpen(false)
    setFollowUpError('')
  }

  const handleCreateFollowUp = async () => {
    if (
      !canScheduleFollowUp ||
      !followUpForm.title.trim() ||
      !followUpForm.dueDate
    ) {
      return
    }

    const dueDate = new Date(
      followUpForm.dueDate,
    )

    if (
      Number.isNaN(dueDate.getTime()) ||
      dueDate <= new Date()
    ) {
      setFollowUpError(
        'Follow-up due date must be in the future.',
      )
      return
    }

    setIsCreatingFollowUp(true)
    setFollowUpError('')
    setSuccessMessage('')

    try {
      const createdFollowUp =
        await createLeadFollowUp(
          numericLeadId,
          {
            title:
              followUpForm.title.trim(),
            description:
              followUpForm.description.trim(),
            due_date:
              dueDate.toISOString(),
          },
        )

      setFollowUps((current) =>
        sortFollowUps([
          ...current,
          createdFollowUp,
        ]),
      )

      setFollowUpDialogOpen(false)
      setFollowUpForm(
        createEmptyFollowUpForm(),
      )
      setActiveTab('follow-ups')
      setFollowUpSuccessMessage(
        'Follow-up scheduled successfully.',
      )
    } catch (requestError) {
      setFollowUpError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to schedule the follow-up.',
      )
    } finally {
      setIsCreatingFollowUp(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={() => navigate('/leads')}
        sx={{ mb: 2 }}
      >
        {isSalesRep
          ? 'Back to My Leads'
          : 'Back to Leads'}
      </Button>

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      <Stack
        direction={{
          xs: 'column',
          lg: 'row',
        }}
        sx={{
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            lg: 'center',
          },
          gap: 3,
          mb: 4,
        }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              mb: 1,
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 800 }}
            >
              {lead.contact_name}
            </Typography>

            <Chip
              label={lead.status_display}
              color={getStatusColor(
                lead.status,
              )}
              size="small"
            />
          </Stack>

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {lead.company_name}
          </Typography>
        </Box>

        {canWorkLead && (
          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
          >
            <Button
              variant="outlined"
              startIcon={<EditRounded />}
            >
              Edit Lead
            </Button>

            {canAddCommunication && (
              <Button
                variant="outlined"
                startIcon={<CallRounded />}
                onClick={openCommunicationDialog}
              >
                Add Communication
              </Button>
            )}

            {canScheduleFollowUp && (
              <Button
                variant="contained"
                startIcon={<EventRounded />}
                onClick={openFollowUpDialog}
              >
                Schedule Follow-up
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Card
        variant="outlined"
        sx={{ mb: 3 }}
      >
        <Tabs
          value={activeTab}
          onChange={(
            _event,
            newValue: WorkspaceTab,
          ) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Tab
            value="overview"
            label="Overview"
          />

          <Tab
            value="communications"
            label={`Communications (${communications.length})`}
          />

          <Tab
            value="follow-ups"
            label={`Follow-ups (${followUps.length})`}
          />

          <Tab
            value="activity"
            label="Activity"
          />

          <Tab
            value="history"
            label="History"
          />
        </Tabs>
      </Card>

      {activeTab === 'overview' && (
        <Stack
          direction={{
            xs: 'column',
            lg: 'row',
          }}
          spacing={3}
          sx={{
            alignItems: 'flex-start',
          }}
        >
          <Stack
            spacing={3}
            sx={{
              flex: 1,
              width: '100%',
            }}
          >
            <Card
              variant="outlined"
              sx={{ p: 3 }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  mb: 3,
                }}
              >
                Lead Information
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                  },
                  gap: 3,
                }}
              >
                <InformationItem
                  label="Contact name"
                  value={lead.contact_name}
                />

                <InformationItem
                  label="Company"
                  value={lead.company_name}
                />

                <InformationItem
                  label="Email"
                  value={
                    lead.email ||
                    'Not provided'
                  }
                />

                <InformationItem
                  label="Phone"
                  value={lead.phone}
                />

                <InformationItem
                  label="Lead source"
                  value={
                    lead.source ||
                    'Not provided'
                  }
                />

                <InformationItem
                  label="Assigned Sales Representative"
                  value={
                    lead.assigned_to_name ||
                    'Unassigned'
                  }
                />

                <InformationItem
                  label="Created by"
                  value={
                    lead.created_by_name
                  }
                />

                <InformationItem
                  label="Created"
                  value={formatDate(
                    lead.created_at,
                  )}
                />

                <InformationItem
                  label="Last updated"
                  value={formatDate(
                    lead.updated_at,
                  )}
                />

                <InformationItem
                  label="Converted"
                  value={formatDate(
                    lead.converted_at,
                  )}
                />
              </Box>
            </Card>

            <Card
              variant="outlined"
              sx={{ p: 3 }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                }}
              >
                Qualification
              </Typography>

              <Typography
                color={
                  lead.qualification_notes
                    ? 'text.primary'
                    : 'text.secondary'
                }
              >
                {lead.qualification_notes ||
                  'No qualification notes have been recorded yet.'}
              </Typography>
            </Card>

            {lead.status === 'LOST' && (
              <Card
                variant="outlined"
                sx={{ p: 3 }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                  }}
                >
                  Lost Lead Reason
                </Typography>

                <Alert severity="error">
                  {lead.lost_reason}
                </Alert>
              </Card>
            )}
          </Stack>

          <Stack
            spacing={3}
            sx={{
              width: {
                xs: '100%',
                lg: 360,
              },
              flexShrink: 0,
            }}
          >
            <Card
              variant="outlined"
              sx={{ p: 3 }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <AssignmentIndRounded
                  color="primary"
                />

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  Ownership
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <InformationItem
                label="Assigned to"
                value={
                  lead.assigned_to_name ||
                  'Unassigned'
                }
              />

              <Box sx={{ mt: 2 }}>
                <InformationItem
                  label="Created by"
                  value={
                    lead.created_by_name
                  }
                />
              </Box>
            </Card>

            <Card
              variant="outlined"
              sx={{ p: 3 }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                }}
              >
                Lead Rescue Radar
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 1,
                  mb: 3,
                }}
              >
                Lead health analysis will
                appear here once
                communication and follow-up
                signals are connected.
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 130,
                  height: 130,
                  mx: 'auto',
                  borderRadius: '50%',
                  border: '10px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                    }}
                  >
                    —
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Health Score
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Stack>
        </Stack>
      )}

      {activeTab === 'communications' && (
        <Box>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Leads&nbsp;&nbsp;›&nbsp;&nbsp;
                {lead.contact_name}
                &nbsp;&nbsp;›&nbsp;&nbsp;
                Communication History
              </Typography>

              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800 }}
                >
                  Communication History
                </Typography>

                <Chip
                  size="small"
                  label={`Lead #${lead.id}`}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <Typography
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                View previous interactions with{' '}
                {lead.contact_name} from{' '}
                {lead.company_name}.
              </Typography>
            </Box>

            {canAddCommunication && (
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={openCommunicationDialog}
                sx={{
                  px: 2.5,
                  minHeight: 42,
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Add Communication
              </Button>
            )}
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            sx={{
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', lg: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { xs: 'stretch', sm: 'center' },
              }}
            >
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', color: 'text.secondary' }}
              >
                <FilterListRounded fontSize="small" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  Filter by:
                </Typography>
              </Stack>

              {(
                [
                  ['ALL', 'All Activities'],
                  ['CALL', 'Calls'],
                  ['EMAIL', 'Emails'],
                  ['MEETING', 'Meetings'],
                  ['WHATSAPP', 'WhatsApp'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="small"
                  variant={
                    communicationFilter === value
                      ? 'outlined'
                      : 'text'
                  }
                  onClick={() =>
                    setCommunicationFilter(value)
                  }
                  sx={{
                    minWidth: 0,
                    px: 1.5,
                    color:
                      communicationFilter === value
                        ? 'text.primary'
                        : 'text.secondary',
                    borderColor: 'divider',
                    textTransform: 'none',
                    fontWeight:
                      communicationFilter === value
                        ? 700
                        : 500,
                  }}
                >
                  {label}
                </Button>
              ))}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Showing {filteredCommunications.length}{' '}
              {filteredCommunications.length === 1
                ? 'activity'
                : 'activities'}
            </Typography>
          </Stack>

          {filteredCommunications.length === 0 ? (
            <Card
              variant="outlined"
              sx={{
                p: 5,
                textAlign: 'center',
                boxShadow: 'none',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                No communications found
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {communications.length === 0
                  ? (
                    canAddCommunication
                      ? 'Record the first customer interaction for this lead.'
                      : 'No customer interactions have been recorded for this lead.'
                  )
                  : 'There are no communications matching this filter.'}
              </Typography>
            </Card>
          ) : (
            <Box
              sx={{
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 20,
                  top: 22,
                  bottom: 22,
                  width: '1px',
                  bgcolor: 'divider',
                },
              }}
            >
              <Stack spacing={2.25}>
                {filteredCommunications.map(
                  (communication) => (
                    <Stack
                      key={communication.id}
                      direction="row"
                      spacing={2}
                      sx={{
                        position: 'relative',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                          width: 42,
                          height: 42,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor:
                            communication.communication_type === 'CALL'
                              ? 'primary.main'
                              : communication.communication_type === 'EMAIL'
                                ? 'info.main'
                                : communication.communication_type === 'MEETING'
                                  ? 'success.main'
                                  : 'warning.main',
                          color: 'common.white',
                          flexShrink: 0,
                        }}
                      >
                        {getCommunicationIcon(
                          communication.communication_type,
                        )}
                      </Box>

                      <Card
                        variant="outlined"
                        sx={{
                          flex: 1,
                          p: { xs: 2, sm: 2.5 },
                          boxShadow: 'none',
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          sx={{
                            justifyContent: 'space-between',
                            gap: 2,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  px: 1,
                                  py: 0.35,
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                  color: 'text.secondary',
                                  fontWeight: 800,
                                  letterSpacing: '0.05em',
                                }}
                              >
                                {communication.communication_type_display.toUpperCase()}
                              </Typography>

                              <Typography
                                sx={{ fontWeight: 800 }}
                              >
                                {communication.summary}
                              </Typography>
                            </Stack>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                lineHeight: 1.65,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {communication.notes ||
                                'No additional communication details were recorded.'}
                            </Typography>

                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={{ xs: 0.75, sm: 2 }}
                              sx={{ mt: 2 }}
                            >
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  alignItems: 'center',
                                  color: 'text.secondary',
                                }}
                              >
                                <PersonOutlineRounded
                                  sx={{ fontSize: 17 }}
                                />
                                <Typography variant="caption">
                                  Recorded by{' '}
                                  {communication.created_by_name}
                                </Typography>
                              </Stack>

                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  alignItems: 'center',
                                  color: 'text.secondary',
                                }}
                              >
                                <CalendarTodayRounded
                                  sx={{ fontSize: 16 }}
                                />
                                <Typography variant="caption">
                                  {formatDate(
                                    communication.communication_date,
                                  )}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>
                        </Stack>
                      </Card>
                    </Stack>
                  ),
                )}
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
          >
            {canAddCommunication && (
              <Card
                variant="outlined"
                onClick={openCommunicationDialog}
                sx={{
                  flex: 1,
                  p: 2.25,
                  cursor: 'pointer',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center' }}
                >
                  <CallRounded color="primary" />
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>
                      Log an Interaction
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Record the latest customer communication.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            )}

            {canScheduleFollowUp && (
              <Card
                variant="outlined"
                onClick={openFollowUpDialog}
                sx={{
                  flex: 1,
                  p: 2.25,
                  cursor: 'pointer',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center' }}
                >
                  <EventRounded color="primary" />
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>
                      Schedule Follow-up
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Set the next action for this lead.
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            )}
          </Stack>
        </Box>
      )}

      {activeTab === 'follow-ups' && (
        <Stack spacing={2.5}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 2.25, sm: 2.75 },
              boxShadow: 'none',
            }}
          >
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
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800 }}
                >
                  Follow-ups
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Track upcoming, overdue, completed and
                  cancelled work for this lead.
                </Typography>
              </Box>

              {canScheduleFollowUp && (
                <Button
                  variant="contained"
                  startIcon={<EventRounded />}
                  onClick={openFollowUpDialog}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    px: 2,
                  }}
                >
                  Schedule Follow-up
                </Button>
              )}
            </Stack>
          </Card>

          {followUpError &&
            !followUpDialogOpen && (
              <Alert
                severity="error"
                onClose={() =>
                  setFollowUpError('')
                }
              >
                {followUpError}
              </Alert>
            )}

          {followUps.length === 0 ? (
            <Card
              variant="outlined"
              sx={{
                p: 5,
                textAlign: 'center',
                boxShadow: 'none',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                No follow-ups yet
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {canScheduleFollowUp
                  ? 'Schedule the next action for this lead.'
                  : 'No follow-ups have been scheduled for this lead.'}
              </Typography>
            </Card>
          ) : (
            followUps.map((followUp) => (
              <Card
                key={followUp.id}
                variant="outlined"
                onClick={() =>
                  navigate(`/follow-ups/${followUp.id}`)
                }
                sx={{
                  p: { xs: 2.25, sm: 2.75 },
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition:
                    'border-color 120ms ease, background-color 120ms ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      spacing={1.25}
                      sx={{
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        mb: 1.25,
                      }}
                    >
                      <Chip
                        size="small"
                        label={getFollowUpLabel(
                          followUp,
                        )}
                        color={getFollowUpColor(
                          followUp,
                        )}
                        sx={{ fontWeight: 700 }}
                      />

                      <Typography
                        sx={{
                          fontWeight: 800,
                          wordBreak: 'break-word',
                        }}
                      >
                        {followUp.title}
                      </Typography>
                    </Stack>

                    {followUp.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          mb: 2,
                        }}
                      >
                        {followUp.description}
                      </Typography>
                    )}

                    <Stack
                      direction={{
                        xs: 'column',
                        md: 'row',
                      }}
                      spacing={{
                        xs: 0.75,
                        md: 2.5,
                      }}
                      sx={{ mb: 1 }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: 'center',
                          color: followUp.is_overdue
                            ? 'error.main'
                            : 'text.secondary',
                        }}
                      >
                        <CalendarTodayRounded
                          sx={{ fontSize: 17 }}
                        />
                        <Typography variant="body2">
                          Due:{' '}
                          {formatDate(
                            followUp.due_date,
                          )}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: 'center',
                          color: 'text.secondary',
                        }}
                      >
                        <PersonOutlineRounded
                          sx={{ fontSize: 18 }}
                        />
                        <Typography variant="body2">
                          Assigned to:{' '}
                          {followUp.assigned_to_name ||
                            'Unassigned'}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Stack
                      direction={{
                        xs: 'column',
                        md: 'row',
                      }}
                      spacing={{
                        xs: 0.75,
                        md: 2.5,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: 'center',
                          color: 'text.secondary',
                        }}
                      >
                        <PersonOutlineRounded
                          sx={{ fontSize: 18 }}
                        />
                        <Typography variant="body2">
                          Created by:{' '}
                          {followUp.created_by_name}
                          {' · '}
                          {formatDate(
                            followUp.created_at,
                          )}
                        </Typography>
                      </Stack>

                      {followUp.completed_at && (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{
                            alignItems: 'center',
                            color: 'text.secondary',
                          }}
                        >
                          <EventRounded
                            sx={{ fontSize: 18 }}
                          />
                          <Typography variant="body2">
                            Completed:{' '}
                            {formatDate(
                              followUp.completed_at,
                            )}
                            {followUp.completed_by_name
                              ? ` · ${followUp.completed_by_name}`
                              : ''}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>

                  <IconButton
                    size="small"
                    aria-label={`View ${followUp.title} details`}
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(
                        `/follow-ups/${followUp.id}`,
                      )
                    }}
                  >
                    <MoreVertRounded />
                  </IconButton>
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      )}

      {activeTab === 'activity' && (
        <Card
          variant="outlined"
          sx={{ p: 4 }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800 }}
          >
            Activity
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Lead activity events will be
            shown as a chronological
            timeline.
          </Typography>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card
          variant="outlined"
          sx={{ p: 4 }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800 }}
          >
            History
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Assignment, status and lifecycle
            history will appear here.
          </Typography>
        </Card>
      )}

      <Dialog
        open={communicationDialogOpen}
        onClose={closeCommunicationDialog}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                Add Communication
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                Log a new interaction with this contact.
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={closeCommunicationDialog}
              disabled={isCreatingCommunication}
              aria-label="Close communication dialog"
            >
              <CloseRounded />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
          }}
        >
          <Stack spacing={2.5}>
            {communicationError && (
              <Alert severity="error">
                {communicationError}
              </Alert>
            )}

            <Card
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'action.hover',
                boxShadow: 'none',
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    fontWeight: 800,
                  }}
                >
                  {lead.contact_name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((namePart) =>
                      namePart.charAt(0).toUpperCase(),
                    )
                    .join('')}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {lead.contact_name}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      alignItems: 'center',
                      color: 'text.secondary',
                      mt: 0.25,
                    }}
                  >
                    <BusinessRounded
                      sx={{ fontSize: 16 }}
                    />

                    <Typography variant="body2">
                      {lead.company_name}
                    </Typography>
                  </Stack>
                </Box>

                <Chip
                  size="small"
                  label="Lead"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Card>

            <FormControl fullWidth>
              <InputLabel>
                Communication Type
              </InputLabel>

              <Select
                value={
                  communicationForm.communicationType
                }
                label="Communication Type"
                onChange={(event) =>
                  setCommunicationForm(
                    (current) => ({
                      ...current,
                      communicationType:
                        event.target
                          .value as CommunicationType,
                    }),
                  )
                }
              >
                <MenuItem value="CALL">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <CallRounded fontSize="small" />
                    <span>Call</span>
                  </Stack>
                </MenuItem>

                <MenuItem value="EMAIL">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <MailOutlineRounded fontSize="small" />
                    <span>Email</span>
                  </Stack>
                </MenuItem>

                <MenuItem value="MEETING">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <GroupsRounded fontSize="small" />
                    <span>Meeting</span>
                  </Stack>
                </MenuItem>

                <MenuItem value="WHATSAPP">
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <ChatBubbleOutlineRounded fontSize="small" />
                    <span>WhatsApp</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <TextField
                required
                type="date"
                label="Date"
                value={
                  communicationForm.communicationDate
                }
                onChange={(event) =>
                  setCommunicationForm(
                    (current) => ({
                      ...current,
                      communicationDate:
                        event.target.value,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              <TextField
                required
                type="time"
                label="Time"
                value={
                  communicationForm.communicationTime
                }
                onChange={(event) =>
                  setCommunicationForm(
                    (current) => ({
                      ...current,
                      communicationTime:
                        event.target.value,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
            </Box>

            <TextField
              required
              label="Subject / Title"
              placeholder="e.g. Initial discovery call"
              value={communicationForm.summary}
              onChange={(event) =>
                setCommunicationForm(
                  (current) => ({
                    ...current,
                    summary: event.target.value,
                  }),
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength: 255,
                },
              }}
            />

            <TextField
              multiline
              minRows={5}
              label="Communication Details"
              placeholder="Summarize the key points of the conversation..."
              value={communicationForm.notes}
              onChange={(event) =>
                setCommunicationForm(
                  (current) => ({
                    ...current,
                    notes: event.target.value,
                  }),
                )
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
          }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              color: 'text.secondary',
            }}
          >
            <PersonOutlineRounded
              sx={{ fontSize: 17 }}
            />

            <Typography variant="caption">
              Visible to permitted CRM team members
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
          >
            <Button
              variant="outlined"
              onClick={closeCommunicationDialog}
              disabled={isCreatingCommunication}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleCreateCommunication()
              }
              disabled={
                isCreatingCommunication ||
                !communicationForm.summary.trim() ||
                !communicationForm.communicationDate ||
                !communicationForm.communicationTime
              }
              sx={{
                textTransform: 'none',
                px: 2.5,
                fontWeight: 700,
              }}
            >
              {isCreatingCommunication ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'Save Communication'
              )}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(followUpSuccessMessage)}
        autoHideDuration={5000}
        onClose={() =>
          setFollowUpSuccessMessage('')
        }
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="success"
          variant="outlined"
          onClose={() =>
            setFollowUpSuccessMessage('')
          }
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 3,
            minWidth: {
              xs: 'auto',
              sm: 320,
            },
          }}
        >
          {followUpSuccessMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={followUpDialogOpen}
        onClose={closeFollowUpDialog}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              Schedule Follow-up
            </Typography>

            <IconButton
              size="small"
              onClick={closeFollowUpDialog}
              disabled={isCreatingFollowUp}
              aria-label="Close follow-up dialog"
            >
              <CloseRounded />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            px: 3,
            pt: 3,
            pb: 2.5,
          }}
        >
          <Stack spacing={2.5}>
            {followUpError && (
              <Alert severity="error">
                {followUpError}
              </Alert>
            )}

            <TextField
              required
              label="Title"
              placeholder="e.g. Call client for requirement discussion"
              value={followUpForm.title}
              onChange={(event) =>
                setFollowUpForm(
                  (current) => ({
                    ...current,
                    title:
                      event.target.value,
                  }),
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength: 255,
                },
              }}
              helperText={`${followUpForm.title.length}/255`}
            />

            <TextField
              required
              type="datetime-local"
              label="Due date and time"
              value={followUpForm.dueDate}
              onChange={(event) =>
                setFollowUpForm(
                  (current) => ({
                    ...current,
                    dueDate:
                      event.target.value,
                  }),
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              multiline
              minRows={5}
              label="Description"
              placeholder="Add details about the follow-up..."
              value={
                followUpForm.description
              }
              onChange={(event) =>
                setFollowUpForm(
                  (current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }),
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength: 1000,
                },
              }}
              helperText={`${followUpForm.description.length}/1000`}
            />

            <Alert severity="info">
              The follow-up will be assigned to the Sales
              Representative responsible for this lead.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            variant="outlined"
            onClick={closeFollowUpDialog}
            disabled={isCreatingFollowUp}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void handleCreateFollowUp()
            }
            disabled={
              isCreatingFollowUp ||
              !followUpForm.title.trim() ||
              !followUpForm.dueDate
            }
            sx={{
              textTransform: 'none',
              px: 2.5,
              fontWeight: 700,
            }}
          >
            {isCreatingFollowUp ? (
              <CircularProgress
                size={22}
                color="inherit"
              />
            ) : (
              'Schedule Follow-up'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LeadWorkspacePage