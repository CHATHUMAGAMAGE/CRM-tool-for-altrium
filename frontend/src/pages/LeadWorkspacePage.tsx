import { useEffect, useState } from 'react'
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
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  AssignmentIndRounded,
  CallRounded,
  EditRounded,
  EventRounded,
} from '@mui/icons-material'
import {
  useNavigate,
  useParams,
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
  updateFollowUp,
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

type CommunicationForm = {
  communicationType: CommunicationType
  communicationDate: string
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

function getCommunicationColor(
  type: CommunicationType,
):
  | 'default'
  | 'info'
  | 'success'
  | 'warning' {
  switch (type) {
    case 'CALL':
      return 'info'

    case 'EMAIL':
      return 'success'

    case 'MEETING':
      return 'warning'

    default:
      return 'default'
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

function getDefaultCommunicationDateTime() {
  const date = new Date(Date.now() - 60_000)
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  )

  return localDate.toISOString().slice(0, 16)
}

function createEmptyCommunicationForm(): CommunicationForm {
  return {
    communicationType: 'CALL',
    communicationDate:
      getDefaultCommunicationDateTime(),
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
    useState<WorkspaceTab>('overview')

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

  const [isCreatingFollowUp, setIsCreatingFollowUp] =
    useState(false)

  const [updatingFollowUpId, setUpdatingFollowUpId] =
    useState<number | null>(null)

  const [followUpDialogOpen, setFollowUpDialogOpen] =
    useState(false)

  const [followUpForm, setFollowUpForm] =
    useState<FollowUpForm>(
      createEmptyFollowUpForm,
    )

  const [followUpError, setFollowUpError] =
    useState('')

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

  const canScheduleFollowUp =
    canWorkLead && !isClosedLead

  const canUpdateFollowUp = (
    followUp: FollowUp,
  ) => {
    if (!currentUser) {
      return false
    }

    if (
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'SALES_MANAGER' ||
      currentUser.role === 'PROJECT_MANAGER'
    ) {
      return true
    }

    return (
      currentUser.role === 'SALES_REP' &&
      followUp.assigned_to === currentUser.id
    )
  }

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
      !communicationForm.communicationDate
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
              communicationForm.communicationDate,
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
      setSuccessMessage(
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

  const handleFollowUpStatusChange = async (
    followUp: FollowUp,
    status: Extract<
      FollowUpStatus,
      'COMPLETED' | 'CANCELLED'
    >,
  ) => {
    if (
      followUp.status !== 'PENDING' ||
      !canUpdateFollowUp(followUp)
    ) {
      return
    }

    setUpdatingFollowUpId(followUp.id)
    setFollowUpError('')
    setSuccessMessage('')

    try {
      const updated =
        await updateFollowUp(
          followUp.id,
          { status },
        )

      setFollowUps((current) =>
        sortFollowUps(
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
        ),
      )

      setSuccessMessage(
        status === 'COMPLETED'
          ? 'Follow-up marked as completed.'
          : 'Follow-up cancelled.',
      )
    } catch (requestError) {
      setFollowUpError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update the follow-up.',
      )
    } finally {
      setUpdatingFollowUpId(null)
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
        <Stack spacing={3}>
          <Card
            variant="outlined"
            sx={{ p: 3 }}
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
                  Communications
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Calls, emails, meetings and
                  WhatsApp conversations recorded
                  for this lead.
                </Typography>
              </Box>

              {canAddCommunication && (
                <Button
                  variant="contained"
                  startIcon={<CallRounded />}
                  onClick={openCommunicationDialog}
                >
                  Add Communication
                </Button>
              )}
            </Stack>
          </Card>

          {communications.length === 0 ? (
            <Card
              variant="outlined"
              sx={{
                p: 5,
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                No communications yet
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {canAddCommunication
                  ? 'Record the first customer interaction for this lead.'
                  : 'No customer interactions have been recorded for this lead.'}
              </Typography>
            </Card>
          ) : (
            communications.map(
              (communication) => (
                <Card
                  key={communication.id}
                  variant="outlined"
                  sx={{ p: 3 }}
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
                      mb: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Chip
                        size="small"
                        label={
                          communication.communication_type_display
                        }
                        color={getCommunicationColor(
                          communication.communication_type,
                        )}
                      />

                      <Typography
                        sx={{ fontWeight: 800 }}
                      >
                        {communication.summary}
                      </Typography>
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {formatDate(
                        communication.communication_date,
                      )}
                    </Typography>
                  </Stack>

                  {communication.notes && (
                    <Typography
                      sx={{
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {communication.notes}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Recorded by{' '}
                    {communication.created_by_name}
                    {' · '}
                    {formatDate(
                      communication.created_at,
                    )}
                  </Typography>
                </Card>
              ),
            )
          )}
        </Stack>
      )}

      {activeTab === 'follow-ups' && (
        <Stack spacing={3}>
          <Card
            variant="outlined"
            sx={{ p: 3 }}
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
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Track upcoming, overdue,
                  completed and cancelled work
                  for this lead.
                </Typography>
              </Box>

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
            followUps.map((followUp) => {
              const canUpdate =
                followUp.status ===
                  'PENDING' &&
                canUpdateFollowUp(
                  followUp,
                )

              return (
                <Card
                  key={followUp.id}
                  variant="outlined"
                  sx={{ p: 3 }}
                >
                  <Stack
                    direction={{
                      xs: 'column',
                      md: 'row',
                    }}
                    sx={{
                      justifyContent:
                        'space-between',
                      alignItems: {
                        xs: 'flex-start',
                        md: 'center',
                      },
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          mb: 1,
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
                        />

                        <Typography
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          {followUp.title}
                        </Typography>
                      </Stack>

                      {followUp.description && (
                        <Typography
                          sx={{
                            whiteSpace:
                              'pre-wrap',
                          }}
                        >
                          {
                            followUp.description
                          }
                        </Typography>
                      )}

                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={{
                          xs: 0.5,
                          sm: 2,
                        }}
                        sx={{ mt: 2 }}
                      >
                        <Typography
                          variant="body2"
                          color={
                            followUp.is_overdue
                              ? 'error'
                              : 'text.secondary'
                          }
                        >
                          Due:{' '}
                          {formatDate(
                            followUp.due_date,
                          )}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Assigned to:{' '}
                          {followUp.assigned_to_name ||
                            'Unassigned'}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        Created by{' '}
                        {followUp.created_by_name}
                        {' · '}
                        {formatDate(
                          followUp.created_at,
                        )}
                      </Typography>

                      {followUp.completed_at && (
                        <Typography
                          variant="body2"
                          color="success.main"
                          sx={{ mt: 0.5 }}
                        >
                          Completed:{' '}
                          {formatDate(
                            followUp.completed_at,
                          )}
                        </Typography>
                      )}
                    </Box>

                    {canUpdate && (
                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={1}
                      >
                        <Button
                          variant="contained"
                          onClick={() =>
                            void handleFollowUpStatusChange(
                              followUp,
                              'COMPLETED',
                            )
                          }
                          disabled={
                            updatingFollowUpId ===
                            followUp.id
                          }
                        >
                          Mark Complete
                        </Button>

                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() =>
                            void handleFollowUpStatusChange(
                              followUp,
                              'CANCELLED',
                            )
                          }
                          disabled={
                            updatingFollowUpId ===
                            followUp.id
                          }
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </Card>
              )
            })
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
      >
        <DialogTitle>
          Record Communication
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2.5}
            sx={{ mt: 1 }}
          >
            {communicationError && (
              <Alert severity="error">
                {communicationError}
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>
                Communication type
              </InputLabel>

              <Select
                value={
                  communicationForm.communicationType
                }
                label="Communication type"
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
                  Call
                </MenuItem>

                <MenuItem value="EMAIL">
                  Email
                </MenuItem>

                <MenuItem value="MEETING">
                  Meeting
                </MenuItem>

                <MenuItem value="WHATSAPP">
                  WhatsApp
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              required
              type="datetime-local"
              label="Communication date and time"
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
              label="Summary"
              placeholder="Briefly describe the customer interaction"
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
              helperText={`${communicationForm.summary.length}/255`}
            />

            <TextField
              multiline
              minRows={4}
              label="Notes"
              placeholder="Add useful details, outcomes, requests or context"
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
            pb: 3,
          }}
        >
          <Button
            onClick={closeCommunicationDialog}
            disabled={isCreatingCommunication}
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
              !communicationForm.communicationDate
            }
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
        </DialogActions>
      </Dialog>

      <Dialog
        open={followUpDialogOpen}
        onClose={closeFollowUpDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Schedule Follow-up
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2.5}
            sx={{ mt: 1 }}
          >
            {followUpError && (
              <Alert severity="error">
                {followUpError}
              </Alert>
            )}

            <TextField
              required
              label="Title"
              placeholder="e.g. Call about pricing decision"
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
              minRows={4}
              label="Description"
              placeholder="Add context or the action that needs to be completed"
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
            />

            <Alert severity="info">
              The follow-up will be assigned
              to the Sales Representative
              responsible for this lead.
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
            onClick={closeFollowUpDialog}
            disabled={isCreatingFollowUp}
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