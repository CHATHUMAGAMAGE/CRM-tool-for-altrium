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
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import {
  ArrowBackRounded,
  CalendarTodayRounded,
  CheckCircleRounded,
  CloseRounded,
  DescriptionRounded,
  EditRounded,
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

  return new Date(
    value,
  ).toLocaleString(
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
  if (
    followUp.is_overdue &&
    followUp.status === 'PENDING'
  ) {
    return 'error'
  }

  if (
    followUp.status ===
    'COMPLETED'
  ) {
    return 'success'
  }

  if (
    followUp.status ===
    'PENDING'
  ) {
    return 'info'
  }

  return 'default'
}


function getFollowUpLabel(
  followUp: FollowUp,
) {
  if (
    followUp.is_overdue &&
    followUp.status === 'PENDING'
  ) {
    return 'Overdue'
  }

  if (
    followUp.status ===
    'PENDING'
  ) {
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
        display:
          'grid',

        gridTemplateColumns: {
          xs:
            '1fr',

          sm:
            '185px minmax(0, 1fr)',
        },

        gap: {
          xs:
            0.5,

          sm:
            2.5,
        },

        px: {
          xs:
            2.25,

          sm:
            2.75,
        },

        py:
          1.7,
      }}
    >
      <Stack
        direction="row"
        spacing={0.9}
        sx={{
          alignItems:
            'center',

          color:
            '#667085',
        }}
      >
        <Box
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            color:
              '#7a8699',
          }}
        >
          {icon}
        </Box>

        <Typography
          sx={{
            fontSize:
              12.5,

            fontWeight:
              500,
          }}
        >
          {label}
        </Typography>
      </Stack>


      <Typography
        sx={{
          color:
            '#172033',

          fontSize:
            13,

          fontWeight:
            500,

          lineHeight:
            1.55,

          whiteSpace:
            'pre-wrap',

          wordBreak:
            'break-word',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}


function FollowUpDetailPage() {
  const navigate =
    useNavigate()

  const {
    followUpId,
  } =
    useParams()


  const [
    followUp,
    setFollowUp,
  ] =
    useState<FollowUp | null>(
      null,
    )


  const [
    lead,
    setLead,
  ] =
    useState<Lead | null>(
      null,
    )


  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    )


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    confirmationOpen,
    setConfirmationOpen,
  ] =
    useState(false)


  const [
    isCompleting,
    setIsCompleting,
  ] =
    useState(false)


  const [
    completionError,
    setCompletionError,
  ] =
    useState('')


  const [
    editDialogOpen,
    setEditDialogOpen,
  ] =
    useState(false)


  const [
    isSavingEdit,
    setIsSavingEdit,
  ] =
    useState(false)


  const [
    editError,
    setEditError,
  ] =
    useState('')


  const [
    editTitle,
    setEditTitle,
  ] =
    useState('')


  const [
    editDescription,
    setEditDescription,
  ] =
    useState('')


  const [
    editDueDate,
    setEditDueDate,
  ] =
    useState('')


  useEffect(
    () => {
      let isMounted =
        true


      const loadFollowUp =
        async () => {
          const numericFollowUpId =
            Number(
              followUpId,
            )


          if (
            !followUpId ||
            Number.isNaN(
              numericFollowUpId,
            )
          ) {
            if (
              isMounted
            ) {
              setError(
                'Invalid follow-up identifier.',
              )

              setIsLoading(
                false,
              )
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
            ] =
              await Promise.all([
                getLead(
                  followUpData.lead,
                ),

                getCurrentUser(),
              ])


            if (
              !isMounted
            ) {
              return
            }


            setFollowUp(
              followUpData,
            )

            setLead(
              leadData,
            )

            setCurrentUser(
              user,
            )
          } catch (
            requestError
          ) {
            if (
              !isMounted
            ) {
              return
            }


            setError(
              requestError
                instanceof Error
                ? requestError.message
                : 'Unable to load this follow-up.',
            )
          } finally {
            if (
              isMounted
            ) {
              setIsLoading(
                false,
              )
            }
          }
        }


      void loadFollowUp()


      return () => {
        isMounted =
          false
      }
    },
    [
      followUpId,
    ],
  )


  if (
    isLoading
  ) {
    return (
      <Box
        sx={{
          minHeight:
            500,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <Stack
          spacing={1.5}
          sx={{
            alignItems:
              'center',
          }}
        >
          <CircularProgress
            size={30}
          />

          <Typography
            sx={{
              color:
                '#7a8699',

              fontSize:
                12.5,
            }}
          >
            Loading follow-up...
          </Typography>
        </Stack>
      </Box>
    )
  }


  if (
    error ||
    !followUp ||
    !lead
  ) {
    return (
      <Box
        sx={{
          px: {
            xs:
              2.5,

            md:
              4,
          },

          py:
            3.5,
        }}
      >
        <Alert
          severity="error"
          sx={{
            mb:
              2.5,
          }}
        >
          {error ||
            'Follow-up not found.'}
        </Alert>


        <Button
          startIcon={
            <ArrowBackRounded />
          }
          onClick={() =>
            navigate(
              '/follow-ups',
            )
          }
        >
          Back to Follow-ups
        </Button>
      </Box>
    )
  }


  const canUpdate =
    currentUser?.role ===
      'ADMIN' ||

    currentUser?.role ===
      'SALES_MANAGER' ||

    currentUser?.role ===
      'PROJECT_MANAGER' ||

    (
      currentUser?.role ===
        'SALES_REP' &&

      followUp.assigned_to ===
        currentUser.id
    )


  const canEdit =
    followUp.status ===
      'PENDING' &&
    canUpdate


  const canComplete =
    followUp.status ===
      'PENDING' &&
    canUpdate


  const openEditDialog =
    () => {
      if (
        !canEdit
      ) {
        return
      }


      const dueDate =
        new Date(
          followUp.due_date,
        )


      const localDate =
        new Date(
          dueDate.getTime() -
            dueDate
              .getTimezoneOffset() *
              60_000,
        )


      setEditTitle(
        followUp.title,
      )


      setEditDescription(
        followUp.description ||
          '',
      )


      setEditDueDate(
        localDate
          .toISOString()
          .slice(
            0,
            16,
          ),
      )


      setEditError(
        '',
      )


      setEditDialogOpen(
        true,
      )
    }


  const closeEditDialog =
    () => {
      if (
        isSavingEdit
      ) {
        return
      }


      setEditDialogOpen(
        false,
      )


      setEditError(
        '',
      )
    }


  const handleSaveEdit =
    async () => {
      if (
        !canEdit
      ) {
        return
      }


      if (
        !editTitle.trim()
      ) {
        setEditError(
          'Follow-up title is required.',
        )

        return
      }


      if (
        !editDueDate
      ) {
        setEditError(
          'Due date and time are required.',
        )

        return
      }


      const dueDate =
        new Date(
          editDueDate,
        )


      if (
        Number.isNaN(
          dueDate.getTime(),
        )
      ) {
        setEditError(
          'Please enter a valid due date and time.',
        )

        return
      }


      if (
        dueDate <=
        new Date()
      ) {
        setEditError(
          'Follow-up due date must be in the future.',
        )

        return
      }


      setIsSavingEdit(
        true,
      )


      setEditError(
        '',
      )


      try {
        const updated =
          await updateFollowUp(
            followUp.id,
            {
              title:
                editTitle.trim(),

              description:
                editDescription.trim(),

              due_date:
                dueDate.toISOString(),
            },
          )


        setFollowUp(
          updated,
        )


        setEditDialogOpen(
          false,
        )
      } catch (
        requestError
      ) {
        setEditError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to update this follow-up.',
        )
      } finally {
        setIsSavingEdit(
          false,
        )
      }
    }


  const handleComplete =
    async () => {
      if (
        !canComplete
      ) {
        return
      }


      setIsCompleting(
        true,
      )


      setCompletionError(
        '',
      )


      try {
        const updated =
          await updateFollowUp(
            followUp.id,
            {
              status:
                'COMPLETED',
            },
          )


        setFollowUp(
          updated,
        )


        setConfirmationOpen(
          false,
        )
      } catch (
        requestError
      ) {
        setCompletionError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to complete this follow-up.',
        )
      } finally {
        setIsCompleting(
          false,
        )
      }
    }


  const isOverdue =
    followUp.status ===
      'PENDING' &&
    followUp.is_overdue


  return (
    <Box
      sx={{
        px: {
          xs:
            2.5,

          md:
            4,
        },

        py: {
          xs:
            3,

          md:
            3.5,
        },
      }}
    >
      <Box
        sx={{
          width:
            '100%',

          maxWidth:
            1120,

          mx:
            'auto',
        }}
      >
        {/*
          BACK
        */}

        <Button
          startIcon={
            <ArrowBackRounded />
          }
          onClick={() =>
            navigate(
              '/follow-ups',
            )
          }
          sx={{
            mb:
              2,

            px:
              0,

            minHeight:
              32,

            color:
              '#667085',

            fontSize:
              12.5,

            '&:hover': {
              bgcolor:
                'transparent',

              color:
                '#0b5cff',
            },
          }}
        >
          Back to Follow-ups
        </Button>


        {/*
          PAGE HEADER
        */}

        <Stack
          direction={{
            xs:
              'column',

            md:
              'row',
          }}
          sx={{
            justifyContent:
              'space-between',

            alignItems: {
              xs:
                'flex-start',

              md:
                'center',
            },

            gap:
              2,

            mb:
              2.5,
          }}
        >
          <Box
            sx={{
              minWidth:
                0,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems:
                  'center',

                flexWrap:
                  'wrap',
              }}
            >
              <Typography
                sx={{
                  color:
                    '#172033',

                  fontSize: {
                    xs:
                      25,

                    md:
                      29,
                  },

                  fontWeight:
                    700,

                  lineHeight:
                    1.2,

                  letterSpacing:
                    '-0.02em',
                }}
              >
                {followUp.title}
              </Typography>


              <Chip
                size="small"
                label={
                  getFollowUpLabel(
                    followUp,
                  )
                }
                color={
                  getFollowUpColor(
                    followUp,
                  )
                }
                variant={
                  followUp.status ===
                  'COMPLETED'
                    ? 'filled'
                    : 'outlined'
                }
              />
            </Stack>


            <Typography
              sx={{
                mt:
                  0.65,

                color:
                  '#667085',

                fontSize:
                  13,
              }}
            >
              {lead.contact_name}
              {' • '}
              {lead.company_name}
            </Typography>
          </Box>


          {canUpdate &&
            followUp.status ===
              'PENDING' && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexWrap:
                    'wrap',
                }}
              >
                {canEdit && (
                  <Button
                    variant="outlined"
                    startIcon={
                      <EditRounded />
                    }
                    onClick={
                      openEditDialog
                    }
                    sx={{
                      bgcolor:
                        '#ffffff',
                    }}
                  >
                    Edit
                  </Button>
                )}


                {canComplete && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={
                      <CheckCircleRounded />
                    }
                    onClick={() => {
                      setCompletionError(
                        '',
                      )

                      setConfirmationOpen(
                        true,
                      )
                    }}
                  >
                    Mark Completed
                  </Button>
                )}
              </Stack>
            )}
        </Stack>


        {/*
          OVERDUE NOTICE
        */}

        {isOverdue && (
          <Alert
            severity="error"
            sx={{
              mb:
                2.5,
            }}
          >
            This follow-up is overdue. Review the action and update or complete it.
          </Alert>
        )}


        {/*
          MAIN DETAILS
        */}

        <Box
          sx={{
            display:
              'grid',

            gridTemplateColumns: {
              xs:
                '1fr',

              lg:
                'minmax(0, 1fr) 300px',
            },

            gap:
              2.5,

            alignItems:
              'start',
          }}
        >
          <Card
            variant="outlined"
            sx={{
              borderColor:
                '#e4e8ef',

              borderRadius:
                '12px',

              boxShadow:
                '0 2px 10px rgba(15, 23, 42, 0.035)',

              overflow:
                'hidden',
            }}
          >
            <Box
              sx={{
                px: {
                  xs:
                    2.25,

                  sm:
                    2.75,
                },

                py:
                  2,
              }}
            >
              <Typography
                sx={{
                  color:
                    '#172033',

                  fontSize:
                    15,

                  fontWeight:
                    700,
                }}
              >
                Follow-up Details
              </Typography>


              <Typography
                sx={{
                  mt:
                    0.25,

                  color:
                    '#7a8699',

                  fontSize:
                    11.5,
                }}
              >
                Scheduled action and ownership information
              </Typography>
            </Box>


            <Divider />


            <DetailRow
              icon={
                <PersonOutlineRounded
                  sx={{
                    fontSize:
                      18,
                  }}
                />
              }
              label="Lead"
              value={
                `${lead.contact_name} (${lead.company_name})`
              }
            />


            <Divider />


            <DetailRow
              icon={
                <CalendarTodayRounded
                  sx={{
                    fontSize:
                      17,
                  }}
                />
              }
              label="Due date and time"
              value={
                formatDate(
                  followUp.due_date,
                )
              }
            />


            <Divider />


            <DetailRow
              icon={
                <PersonOutlineRounded
                  sx={{
                    fontSize:
                      18,
                  }}
                />
              }
              label="Assigned to"
              value={
                followUp.assigned_to_name ||
                'Unassigned'
              }
            />


            <Divider />


            <DetailRow
              icon={
                <DescriptionRounded
                  sx={{
                    fontSize:
                      17,
                  }}
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
                  sx={{
                    fontSize:
                      18,
                  }}
                />
              }
              label="Created by"
              value={
                followUp.created_by_name ||
                '—'
              }
            />


            <Divider />


            <DetailRow
              icon={
                <EventAvailableRounded
                  sx={{
                    fontSize:
                      17,
                  }}
                />
              }
              label="Created"
              value={
                formatDate(
                  followUp.created_at,
                )
              }
            />


            {followUp.status ===
              'PENDING' && (
              <>
                <Divider />

                <DetailRow
                  icon={
                    <EventAvailableRounded
                      sx={{
                        fontSize:
                          17,
                      }}
                    />
                  }
                  label="Last updated"
                  value={
                    formatDate(
                      followUp.updated_at,
                    )
                  }
                />
              </>
            )}


            {followUp.completed_at && (
              <>
                <Divider />

                <DetailRow
                  icon={
                    <CheckCircleRounded
                      sx={{
                        fontSize:
                          18,

                        color:
                          '#039855',
                      }}
                    />
                  }
                  label="Completed"
                  value={
                    formatDate(
                      followUp.completed_at,
                    )
                  }
                />
              </>
            )}


            {followUp.completed_by_name && (
              <>
                <Divider />

                <DetailRow
                  icon={
                    <PersonOutlineRounded
                      sx={{
                        fontSize:
                          18,
                      }}
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


          {/*
            STATUS SIDEBAR
          */}

          <Stack
            spacing={2}
          >
            <Card
              variant="outlined"
              sx={{
                borderColor:
                  '#e4e8ef',

                borderRadius:
                  '12px',

                boxShadow:
                  '0 2px 10px rgba(15, 23, 42, 0.035)',

                overflow:
                  'hidden',
              }}
            >
              <Box
                sx={{
                  px:
                    2.25,

                  py:
                    2,
                }}
              >
                <Typography
                  sx={{
                    color:
                      '#172033',

                    fontSize:
                      14,

                    fontWeight:
                      700,
                  }}
                >
                  Status
                </Typography>


                <Typography
                  sx={{
                    mt:
                      0.25,

                    color:
                      '#7a8699',

                    fontSize:
                      11.5,
                  }}
                >
                  Current follow-up state
                </Typography>
              </Box>


              <Divider />


              <Box
                sx={{
                  p:
                    2.25,
                }}
              >
                <Chip
                  label={
                    getFollowUpLabel(
                      followUp,
                    )
                  }
                  color={
                    getFollowUpColor(
                      followUp,
                    )
                  }
                  variant={
                    followUp.status ===
                    'COMPLETED'
                      ? 'filled'
                      : 'outlined'
                  }
                />


                <Typography
                  sx={{
                    mt:
                      1.5,

                    color:
                      '#667085',

                    fontSize:
                      12,

                    lineHeight:
                      1.6,
                  }}
                >
                  {followUp.status ===
                  'COMPLETED'
                    ? 'This follow-up has been completed.'
                    : isOverdue
                      ? 'This action is past its scheduled due date.'
                      : 'This follow-up is still pending.'}
                </Typography>
              </Box>
            </Card>


            <Card
              variant="outlined"
              sx={{
                borderColor:
                  '#e4e8ef',

                borderRadius:
                  '12px',

                boxShadow:
                  '0 2px 10px rgba(15, 23, 42, 0.035)',
              }}
            >
              <Box
                sx={{
                  p:
                    2.25,
                }}
              >
                <Typography
                  sx={{
                    color:
                      '#172033',

                    fontSize:
                      14,

                    fontWeight:
                      700,
                  }}
                >
                  Related Lead
                </Typography>


                <Typography
                  sx={{
                    mt:
                      1.25,

                    color:
                      '#172033',

                    fontSize:
                      13,

                    fontWeight:
                      600,
                  }}
                >
                  {lead.contact_name}
                </Typography>


                <Typography
                  sx={{
                    mt:
                      0.15,

                    color:
                      '#7a8699',

                    fontSize:
                      11.5,
                  }}
                >
                  {lead.company_name}
                </Typography>


                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      `/leads/${lead.id}?tab=follow-ups`,
                    )
                  }
                  sx={{
                    mt:
                      2,

                    bgcolor:
                      '#ffffff',
                  }}
                >
                  Open Lead
                </Button>
              </Box>
            </Card>
          </Stack>
        </Box>
      </Box>


      {/*
        EDIT FOLLOW-UP
      */}

      <Dialog
        open={
          editDialogOpen
        }
        onClose={
          closeEditDialog
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',

              gap:
                2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  color:
                    '#172033',

                  fontSize:
                    18,

                  fontWeight:
                    700,
                }}
              >
                Edit Follow-up
              </Typography>


              <Typography
                sx={{
                  mt:
                    0.3,

                  color:
                    '#7a8699',

                  fontSize:
                    12,
                }}
              >
                Update the planned follow-up details.
              </Typography>
            </Box>


            <IconButton
              size="small"
              onClick={
                closeEditDialog
              }
              disabled={
                isSavingEdit
              }
              aria-label="Close edit follow-up dialog"
            >
              <CloseRounded />
            </IconButton>
          </Stack>
        </DialogTitle>


        <DialogContent>
          <Stack
            spacing={2.25}
            sx={{
              mt:
                1,
            }}
          >
            {editError && (
              <Alert
                severity="error"
              >
                {editError}
              </Alert>
            )}


            <TextField
              required
              label="Title"
              value={
                editTitle
              }
              onChange={(
                event,
              ) =>
                setEditTitle(
                  event.target.value,
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength:
                    255,
                },
              }}
              helperText={`${editTitle.length}/255`}
            />


            <TextField
              required
              type="datetime-local"
              label="Due date and time"
              value={
                editDueDate
              }
              onChange={(
                event,
              ) =>
                setEditDueDate(
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink:
                    true,
                },
              }}
            />


            <TextField
              multiline
              minRows={4}
              label="Description"
              placeholder="Add details about the follow-up..."
              value={
                editDescription
              }
              onChange={(
                event,
              ) =>
                setEditDescription(
                  event.target.value,
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength:
                    1000,
                },
              }}
              helperText={`${editDescription.length}/1000`}
            />


            <Alert
              severity="info"
            >
              The lead and assigned Sales Representative cannot be changed from this screen.
            </Alert>
          </Stack>
        </DialogContent>


        <DialogActions
          sx={{
            px:
              3,

            pb:
              3,

            pt:
              2,
          }}
        >
          <Button
            variant="outlined"
            onClick={
              closeEditDialog
            }
            disabled={
              isSavingEdit
            }
          >
            Cancel
          </Button>


          <Button
            variant="contained"
            onClick={() =>
              void handleSaveEdit()
            }
            disabled={
              isSavingEdit ||
              !editTitle.trim() ||
              !editDueDate
            }
          >
            {isSavingEdit ? (
              <CircularProgress
                size={21}
                color="inherit"
              />
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogActions>
      </Dialog>


      {/*
        COMPLETE FOLLOW-UP
      */}

      <Dialog
        open={
          confirmationOpen
        }
        onClose={() => {
          if (
            !isCompleting
          ) {
            setConfirmationOpen(
              false,
            )

            setCompletionError(
              '',
            )
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent
          sx={{
            pt:
              4,

            px:
              4,

            pb:
              2,

            textAlign:
              'center',
          }}
        >
          <Box
            sx={{
              width:
                58,

              height:
                58,

              mx:
                'auto',

              mb:
                2,

              borderRadius:
                '50%',

              bgcolor:
                '#ecfdf3',

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',

              color:
                '#039855',
            }}
          >
            <CheckCircleRounded
              sx={{
                fontSize:
                  34,
              }}
            />
          </Box>


          <Typography
            sx={{
              color:
                '#172033',

              fontSize:
                18,

              fontWeight:
                700,
            }}
          >
            Mark as Completed?
          </Typography>


          <Typography
            sx={{
              mt:
                0.8,

              mx:
                'auto',

              maxWidth:
                300,

              color:
                '#667085',

              fontSize:
                12.5,

              lineHeight:
                1.6,
            }}
          >
            Confirm that this follow-up action has been completed.
          </Typography>


          {completionError && (
            <Alert
              severity="error"
              sx={{
                mt:
                  2.5,

                textAlign:
                  'left',
              }}
            >
              {completionError}
            </Alert>
          )}
        </DialogContent>


        <DialogActions
          sx={{
            px:
              3,

            pb:
              3,

            pt:
              1,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              setConfirmationOpen(
                false,
              )

              setCompletionError(
                '',
              )
            }}
            disabled={
              isCompleting
            }
          >
            Cancel
          </Button>


          <Button
            variant="contained"
            color="success"
            onClick={() =>
              void handleComplete()
            }
            disabled={
              isCompleting
            }
          >
            {isCompleting ? (
              <CircularProgress
                size={21}
                color="inherit"
              />
            ) : (
              'Mark Completed'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}


export default FollowUpDetailPage