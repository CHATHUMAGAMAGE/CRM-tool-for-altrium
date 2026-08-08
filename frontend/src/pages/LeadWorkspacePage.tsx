import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
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
  getLead,
  type Lead,
  type LeadStatus,
} from '../services/crm'

type WorkspaceTab =
  | 'overview'
  | 'communications'
  | 'follow-ups'
  | 'activity'
  | 'history'

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

  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>('overview')

  const [isLoading, setIsLoading] =
    useState(true)

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
        const [leadData, user] =
          await Promise.all([
            getLead(numericLeadId),
            getCurrentUser(),
          ])

        if (!isMounted) {
          return
        }

        setLead(leadData)
        setCurrentUser(user)
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

            <Button
              variant="outlined"
              startIcon={<CallRounded />}
            >
              Add Communication
            </Button>

            <Button
              variant="contained"
              startIcon={<EventRounded />}
            >
              Schedule Follow-up
            </Button>
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
            label="Communications"
          />

          <Tab
            value="follow-ups"
            label="Follow-ups"
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
        <Card
          variant="outlined"
          sx={{ p: 4 }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800 }}
          >
            Communications
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Calls, emails, meetings,
            messages and notes for this
            lead will appear here.
          </Typography>
        </Card>
      )}

      {activeTab === 'follow-ups' && (
        <Card
          variant="outlined"
          sx={{ p: 4 }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800 }}
          >
            Follow-ups
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Upcoming, overdue and completed
            follow-ups will appear here.
          </Typography>
        </Card>
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
    </Box>
  )
}

export default LeadWorkspacePage