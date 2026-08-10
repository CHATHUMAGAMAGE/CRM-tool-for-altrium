import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
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
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  CalendarTodayRounded,
  CheckCircleRounded,
  DescriptionRounded,
  EventAvailableRounded,
  PersonOutlineRounded,
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
  getFollowUp,
  getLead,
  updateFollowUp,
  type FollowUp,
  type Lead,
} from '../services/crm'

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

function getFollowUpColor(
  followUp: FollowUp,
):
  | 'default'
  | 'info'
  | 'success'
  | 'error' {
  if (followUp.is_overdue) {
    return 'error'
  }

  if (followUp.status === 'COMPLETED') {
    return 'success'
  }

  if (followUp.status === 'PENDING') {
    return 'info'
  }

  return 'default'
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '190px minmax(0, 1fr)',
        },
        gap: {
          xs: 0.5,
          sm: 2,
        },
        py: 1.65,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          color: 'text.secondary',
        }}
      >
        {icon}

        <Typography
          variant="body2"
          sx={{ fontWeight: 600 }}
        >
          {label}
        </Typography>
      </Stack>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 500,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function FollowUpDetailPage() {
  const navigate = useNavigate()
  const { followUpId } = useParams()

  const [followUp, setFollowUp] =
    useState<FollowUp | null>(null)

  const [lead, setLead] =
    useState<Lead | null>(null)

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [confirmationOpen, setConfirmationOpen] =
    useState(false)

  const [isCompleting, setIsCompleting] =
    useState(false)

  const [completionError, setCompletionError] =
    useState('')

  useEffect(() => {
    let isMounted = true

    const loadFollowUp = async () => {
      const numericFollowUpId =
        Number(followUpId)

      if (
        !followUpId ||
        Number.isNaN(numericFollowUpId)
      ) {
        if (isMounted) {
          setError('Invalid follow-up identifier.')
          setIsLoading(false)
        }

        return
      }

      try {
        const followUpData =
          await getFollowUp(
            numericFollowUpId,
          )

        const [
          leadData,
          user,
        ] = await Promise.all([
          getLead(followUpData.lead),
          getCurrentUser(),
        ])

        if (!isMounted) {
          return
        }

        setFollowUp(followUpData)
        setLead(leadData)
        setCurrentUser(user)
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load this follow-up.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadFollowUp()

    return () => {
      isMounted = false
    }
  }, [followUpId])

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
          sx={{ alignItems: 'center' }}
        >
          <CircularProgress />

          <Typography color="text.secondary">
            Loading follow-up...
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (error || !followUp || !lead) {
    return (
      <Box sx={{ p: { xs: 3, md: 5 } }}>
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error || 'Follow-up not found.'}
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

  const canUpdate =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role ===
      'SALES_MANAGER' ||
    currentUser?.role ===
      'PROJECT_MANAGER' ||
    (
      currentUser?.role === 'SALES_REP' &&
      followUp.assigned_to ===
        currentUser.id
    )

  const canComplete =
    followUp.status === 'PENDING' &&
    canUpdate

  const handleComplete = async () => {
    if (!canComplete) {
      return
    }

    setIsCompleting(true)
    setCompletionError('')

    try {
      const updated =
        await updateFollowUp(
          followUp.id,
          {
            status: 'COMPLETED',
          },
        )

      setFollowUp(updated)
      setConfirmationOpen(false)
    } catch (requestError) {
      setCompletionError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to complete this follow-up.',
      )
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 3, md: 5 },
        maxWidth: 980,
        mx: 'auto',
      }}
    >
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={() =>
          navigate(
            `/leads/${lead.id}?tab=follow-ups`,
          )
        }
        sx={{
          mb: 2.5,
          textTransform: 'none',
        }}
      >
        Back to Follow-ups
      </Button>

      <Stack
        direction={{
          xs: 'column',
          md: 'row',
        }}
        sx={{
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 800 }}
            >
              {followUp.title}
            </Typography>

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
          </Stack>
        </Box>
      </Stack>

      <Card
        variant="outlined"
        sx={{
          px: { xs: 2.25, sm: 3 },
          py: 1,
          boxShadow: 'none',
        }}
      >
        <DetailRow
          icon={
            <PersonOutlineRounded
              sx={{ fontSize: 19 }}
            />
          }
          label="Lead"
          value={`${lead.contact_name} (${lead.company_name})`}
        />

        <Divider />

        <DetailRow
          icon={
            <CalendarTodayRounded
              sx={{ fontSize: 18 }}
            />
          }
          label="Due date and time"
          value={formatDate(
            followUp.due_date,
          )}
        />

        <Divider />

        <DetailRow
          icon={
            <PersonOutlineRounded
              sx={{ fontSize: 19 }}
            />
          }
          label="Assigned to"
          value={
            followUp.assigned_to_name
              ? `${followUp.assigned_to_name} (Sales Representative)`
              : 'Unassigned'
          }
        />

        <Divider />

        <DetailRow
          icon={
            <DescriptionRounded
              sx={{ fontSize: 18 }}
            />
          }
          label="Description"
          value={
            followUp.description ||
            'No description provided.'
          }
        />

        <Divider />

        <DetailRow
          icon={
            <PersonOutlineRounded
              sx={{ fontSize: 19 }}
            />
          }
          label="Created by"
          value={followUp.created_by_name}
        />

        <Divider />

        <DetailRow
          icon={
            <EventAvailableRounded
              sx={{ fontSize: 18 }}
            />
          }
          label="Created on"
          value={formatDate(
            followUp.created_at,
          )}
        />

        {followUp.status === 'PENDING' && (
          <>
            <Divider />

            <DetailRow
              icon={
                <EventAvailableRounded
                  sx={{ fontSize: 18 }}
                />
              }
              label="Last updated"
              value={formatDate(
                followUp.updated_at,
              )}
            />
          </>
        )}

        {followUp.completed_at && (
          <>
            <Divider />

            <DetailRow
              icon={
                <CheckCircleRounded
                  sx={{ fontSize: 19 }}
                />
              }
              label="Completed on"
              value={formatDate(
                followUp.completed_at,
              )}
            />
          </>
        )}

        {followUp.completed_by_name && (
          <>
            <Divider />

            <DetailRow
              icon={
                <PersonOutlineRounded
                  sx={{ fontSize: 19 }}
                />
              }
              label="Completed by"
              value={
                followUp.completed_by_name
              }
            />
          </>
        )}
      </Card>

      <Card
        variant="outlined"
        sx={{
          mt: 2.5,
          p: { xs: 2.25, sm: 3 },
          boxShadow: 'none',
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            mb: 2,
          }}
        >
          Status
        </Typography>

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

          {canComplete && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setCompletionError('')
                setConfirmationOpen(true)
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Mark as Completed
            </Button>
          )}
        </Stack>
      </Card>

      <Dialog
        open={confirmationOpen}
        onClose={() => {
          if (!isCompleting) {
            setConfirmationOpen(false)
            setCompletionError('')
          }
        }}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogContent
          sx={{
            pt: 4,
            px: 4,
            pb: 2.5,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 68,
              height: 68,
              mx: 'auto',
              mb: 2,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
            }}
          >
            <CheckCircleRounded
              sx={{ fontSize: 44 }}
            />
          </Box>

          <Typography
            variant="h6"
            sx={{ fontWeight: 800 }}
          >
            Mark as Completed?
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              maxWidth: 300,
              mx: 'auto',
            }}
          >
            Are you sure you want to mark this
            follow-up as completed?
          </Typography>

          {completionError && (
            <Alert
              severity="error"
              sx={{
                mt: 2.5,
                textAlign: 'left',
              }}
            >
              {completionError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 1,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              setConfirmationOpen(false)
              setCompletionError('')
            }}
            disabled={isCompleting}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void handleComplete()
            }
            disabled={isCompleting}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {isCompleting ? (
              <CircularProgress
                size={22}
                color="inherit"
              />
            ) : (
              'Yes, Mark as Completed'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FollowUpDetailPage