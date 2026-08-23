import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import {
  CalendarTodayRounded,
  CheckCircleOutlineRounded,
  ErrorOutlineRounded,
  EventRounded,
  PersonOutlineRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material'

import {
  useNavigate,
} from 'react-router'

import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'

import {
  getLeadFollowUps,
  getLeads,
  type FollowUp,
  type FollowUpStatus,
  type Lead,
} from '../services/crm'


type FollowUpFilter =
  | 'ALL'
  | FollowUpStatus

type FollowUpView =
  | 'ALL'
  | 'OVERDUE'
  | 'UPCOMING'


type FollowUpWithLead = {
  followUp: FollowUp
  lead: Lead
}


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

  switch (
    followUp.status
  ) {
    case 'PENDING':
      return 'info'

    case 'COMPLETED':
      return 'success'

    case 'CANCELLED':
    default:
      return 'default'
  }
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
    followUp.status === 'PENDING'
  ) {
    return 'Upcoming'
  }

  return followUp.status_display
}


function sortFollowUps(
  items: FollowUpWithLead[],
) {
  return [
    ...items,
  ].sort(
    (
      first,
      second,
    ) => {
      const firstFollowUp =
        first.followUp

      const secondFollowUp =
        second.followUp

      /*
       * Overdue pending follow-ups first.
       */
      if (
        firstFollowUp.is_overdue &&
        firstFollowUp.status === 'PENDING' &&
        !(
          secondFollowUp.is_overdue &&
          secondFollowUp.status === 'PENDING'
        )
      ) {
        return -1
      }

      if (
        secondFollowUp.is_overdue &&
        secondFollowUp.status === 'PENDING' &&
        !(
          firstFollowUp.is_overdue &&
          firstFollowUp.status === 'PENDING'
        )
      ) {
        return 1
      }

      /*
       * Pending follow-ups before completed/cancelled.
       */
      if (
        firstFollowUp.status === 'PENDING' &&
        secondFollowUp.status !== 'PENDING'
      ) {
        return -1
      }

      if (
        secondFollowUp.status === 'PENDING' &&
        firstFollowUp.status !== 'PENDING'
      ) {
        return 1
      }

      /*
       * Otherwise sort by due date.
       */
      return (
        new Date(
          firstFollowUp.due_date,
        ).getTime() -
        new Date(
          secondFollowUp.due_date,
        ).getTime()
      )
    },
  )
}


function FollowUpsPage() {
  const navigate =
    useNavigate()


  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    )


  const [
    followUps,
    setFollowUps,
  ] =
    useState<
      FollowUpWithLead[]
    >([])


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
    search,
    setSearch,
  ] =
    useState('')


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<FollowUpFilter>(
      'ALL',
    )


  const [
    viewFilter,
    setViewFilter,
  ] =
    useState<FollowUpView>(
      'ALL',
    )


  const loadFollowUps =
    async () => {
      setIsLoading(
        true,
      )

      setError(
        '',
      )

      try {
        const [
          user,
          leads,
        ] =
          await Promise.all([
            getCurrentUser(),
            getLeads(),
          ])

        const followUpGroups =
          await Promise.all(
            leads.map(
              async (
                lead,
              ) => {
                const leadFollowUps =
                  await getLeadFollowUps(
                    lead.id,
                  )

                return leadFollowUps.map(
                  (
                    followUp,
                  ) => ({
                    followUp,
                    lead,
                  }),
                )
              },
            ),
          )

        const combinedFollowUps =
          followUpGroups.flat()

        setCurrentUser(
          user,
        )

        setFollowUps(
          sortFollowUps(
            combinedFollowUps,
          ),
        )
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to load follow-ups.',
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  useEffect(
    () => {
      void loadFollowUps()
    },
    [],
  )


  const isSalesRepresentative =
    currentUser?.role ===
    'SALES_REP'


  const pendingCount =
    useMemo(
      () =>
        followUps.filter(
          (
            item,
          ) =>
            item.followUp.status ===
            'PENDING',
        ).length,
      [
        followUps,
      ],
    )


  const overdueCount =
    useMemo(
      () =>
        followUps.filter(
          (
            item,
          ) =>
            item.followUp.status ===
              'PENDING' &&
            item.followUp.is_overdue,
        ).length,
      [
        followUps,
      ],
    )


  const completedCount =
    useMemo(
      () =>
        followUps.filter(
          (
            item,
          ) =>
            item.followUp.status ===
            'COMPLETED',
        ).length,
      [
        followUps,
      ],
    )


  const filteredFollowUps =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()

        return followUps.filter(
          (
            item,
          ) => {
            const {
              followUp,
              lead,
            } =
              item

            const matchesSearch =
              !query ||
              followUp.title
                .toLowerCase()
                .includes(
                  query,
                ) ||
              followUp.description
                .toLowerCase()
                .includes(
                  query,
                ) ||
              lead.contact_name
                .toLowerCase()
                .includes(
                  query,
                ) ||
              lead.company_name
                .toLowerCase()
                .includes(
                  query,
                ) ||
              (
                followUp.assigned_to_name ||
                ''
              )
                .toLowerCase()
                .includes(
                  query,
                )

            const matchesStatus =
              statusFilter ===
                'ALL' ||
              followUp.status ===
                statusFilter

            const matchesView =
              viewFilter ===
                'ALL' ||
              (
                viewFilter ===
                  'OVERDUE' &&
                followUp.status ===
                  'PENDING' &&
                followUp.is_overdue
              ) ||
              (
                viewFilter ===
                  'UPCOMING' &&
                followUp.status ===
                  'PENDING' &&
                !followUp.is_overdue
              )

            return (
              matchesSearch &&
              matchesStatus &&
              matchesView
            )
          },
        )
      },
      [
        followUps,
        search,
        statusFilter,
        viewFilter,
      ],
    )


  return (
    <Box
      sx={{
        p: {
          xs: 3,
          md: 5,
        },
      }}
    >
      {/* HEADER */}

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        sx={{
          justifyContent:
            'space-between',

          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },

          gap:
            2,

          mb:
            4,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight:
                800,
            }}
          >
            {isSalesRepresentative
              ? 'My Follow-ups'
              : 'Follow-ups'}
          </Typography>

          <Typography
            color="text.secondary"
          >
            {isSalesRepresentative
              ? 'Track upcoming, overdue and completed actions for your leads.'
              : 'Track follow-up activity across accessible leads.'}
          </Typography>
        </Box>


        <Button
          startIcon={
            <RefreshRounded />
          }
          onClick={() =>
            void loadFollowUps()
          }
          disabled={
            isLoading
          }
        >
          Refresh
        </Button>
      </Stack>


      {error && (
        <Alert
          severity="error"
          sx={{
            mb:
              3,
          }}
        >
          {error}
        </Alert>
      )}


      {/* SUMMARY */}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns:
            {
              xs:
                '1fr',

              sm:
                'repeat(2, 1fr)',

              lg:
                'repeat(4, 1fr)',
            },

          gap:
            2,

          mb:
            3,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            p:
              2.5,
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Total Follow-ups
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight:
                    800,

                  mt:
                    0.5,
                }}
              >
                {
                  followUps.length
                }
              </Typography>
            </Box>

            <EventRounded
              color="primary"
            />
          </Stack>
        </Card>


        <Card
          variant="outlined"
          sx={{
            p:
              2.5,
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Pending
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight:
                    800,

                  mt:
                    0.5,
                }}
              >
                {
                  pendingCount
                }
              </Typography>
            </Box>

            <CalendarTodayRounded
              color="primary"
            />
          </Stack>
        </Card>


        <Card
          variant="outlined"
          sx={{
            p:
              2.5,
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Overdue
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight:
                    800,

                  mt:
                    0.5,

                  color:
                    overdueCount >
                    0
                      ? 'error.main'
                      : 'text.primary',
                }}
              >
                {
                  overdueCount
                }
              </Typography>
            </Box>

            <ErrorOutlineRounded
              color={
                overdueCount >
                0
                  ? 'error'
                  : 'disabled'
              }
            />
          </Stack>
        </Card>


        <Card
          variant="outlined"
          sx={{
            p:
              2.5,
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',
            }}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Completed
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight:
                    800,

                  mt:
                    0.5,
                }}
              >
                {
                  completedCount
                }
              </Typography>
            </Box>

            <CheckCircleOutlineRounded
              color="success"
            />
          </Stack>
        </Card>
      </Box>


      {/* FILTERS */}

      <Card
        variant="outlined"
        sx={{
          p:
            2,

          mb:
            3,
        }}
      >
        <Stack
          direction={{
            xs:
              'column',

            lg:
              'row',
          }}
          spacing={
            2
          }
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search follow-up, lead, company or assignee"
            value={
              search
            }
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            slotProps={{
              input:
                {
                  startAdornment:
                    (
                      <InputAdornment position="start">
                        <SearchRounded />
                      </InputAdornment>
                    ),
                },
            }}
          />


          <FormControl
            size="small"
            sx={{
              minWidth:
                180,
            }}
          >
            <InputLabel>
              View
            </InputLabel>

            <Select
              value={
                viewFilter
              }
              label="View"
              onChange={(
                event,
              ) =>
                setViewFilter(
                  event.target
                    .value as FollowUpView,
                )
              }
            >
              <MenuItem
                value="ALL"
              >
                All
              </MenuItem>

              <MenuItem
                value="UPCOMING"
              >
                Upcoming
              </MenuItem>

              <MenuItem
                value="OVERDUE"
              >
                Overdue
              </MenuItem>
            </Select>
          </FormControl>


          <FormControl
            size="small"
            sx={{
              minWidth:
                180,
            }}
          >
            <InputLabel>
              Status
            </InputLabel>

            <Select
              value={
                statusFilter
              }
              label="Status"
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value as FollowUpFilter,
                )
              }
            >
              <MenuItem
                value="ALL"
              >
                All statuses
              </MenuItem>

              <MenuItem
                value="PENDING"
              >
                Pending
              </MenuItem>

              <MenuItem
                value="COMPLETED"
              >
                Completed
              </MenuItem>

              <MenuItem
                value="CANCELLED"
              >
                Cancelled
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Card>


      {/* CONTENT */}

      {isLoading ? (
        <Box
          sx={{
            py:
              8,

            display:
              'flex',

            justifyContent:
              'center',
          }}
        >
          <Stack
            spacing={
              2
            }
            sx={{
              alignItems:
                'center',
            }}
          >
            <CircularProgress />

            <Typography
              color="text.secondary"
            >
              Loading follow-ups...
            </Typography>
          </Stack>
        </Box>
      ) : filteredFollowUps.length ===
        0 ? (
        <Card
          variant="outlined"
          sx={{
            p:
              5,

            textAlign:
              'center',
          }}
        >
          <EventRounded
            color="disabled"
            sx={{
              fontSize:
                48,
            }}
          />

          <Typography
            variant="h6"
            sx={{
              fontWeight:
                800,

              mt:
                1,
            }}
          >
            No follow-ups found
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt:
                0.75,
            }}
          >
            Try changing your search or filters.
          </Typography>
        </Card>
      ) : (
        <Stack
          spacing={
            2
          }
        >
          {filteredFollowUps.map(
            (
              item,
            ) => {
              const {
                followUp,
                lead,
              } =
                item

              return (
                <Card
                  key={
                    followUp.id
                  }
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      `/follow-ups/${followUp.id}`,
                    )
                  }
                  sx={{
                    p: {
                      xs:
                        2.25,

                      sm:
                        2.75,
                    },

                    cursor:
                      'pointer',

                    boxShadow:
                      'none',

                    '&:hover':
                      {
                        borderColor:
                          'primary.main',

                        bgcolor:
                          'action.hover',
                      },
                  }}
                >
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

                      gap:
                        2,
                    }}
                  >
                    <Box
                      sx={{
                        flex:
                          1,

                        minWidth:
                          0,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={
                          1
                        }
                        sx={{
                          alignItems:
                            'center',

                          flexWrap:
                            'wrap',

                          mb:
                            1,
                        }}
                      >
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
                          sx={{
                            fontWeight:
                              700,
                          }}
                        />

                        <Typography
                          sx={{
                            fontWeight:
                              800,

                            fontSize:
                              16,
                          }}
                        >
                          {
                            followUp.title
                          }
                        </Typography>
                      </Stack>


                      <Typography
                        sx={{
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          lead.contact_name
                        }
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {
                          lead.company_name
                        }
                      </Typography>


                      {followUp.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt:
                              1.5,

                            whiteSpace:
                              'pre-wrap',
                          }}
                        >
                          {
                            followUp.description
                          }
                        </Typography>
                      )}
                    </Box>


                    <Stack
                      spacing={
                        1
                      }
                      sx={{
                        minWidth: {
                          xs:
                            0,

                          md:
                            260,
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={
                          0.75
                        }
                        sx={{
                          alignItems:
                            'center',

                          color:
                            followUp.is_overdue &&
                            followUp.status ===
                              'PENDING'
                              ? 'error.main'
                              : 'text.secondary',
                        }}
                      >
                        <CalendarTodayRounded
                          sx={{
                            fontSize:
                              18,
                          }}
                        />

                        <Typography
                          variant="body2"
                        >
                          Due:{' '}
                          {formatDate(
                            followUp.due_date,
                          )}
                        </Typography>
                      </Stack>


                      <Stack
                        direction="row"
                        spacing={
                          0.75
                        }
                        sx={{
                          alignItems:
                            'center',

                          color:
                            'text.secondary',
                        }}
                      >
                        <PersonOutlineRounded
                          sx={{
                            fontSize:
                              19,
                          }}
                        />

                        <Typography
                          variant="body2"
                        >
                          Assigned to:{' '}
                          {followUp.assigned_to_name ||
                            'Unassigned'}
                        </Typography>
                      </Stack>


                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Created by{' '}
                        {
                          followUp.created_by_name
                        }
                      </Typography>
                    </Stack>
                  </Stack>
                </Card>
              )
            },
          )}
        </Stack>
      )}
    </Box>
  )
}


export default FollowUpsPage