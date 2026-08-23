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
  Divider,
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
    followUp.status ===
      'PENDING'
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
    followUp.status ===
      'PENDING'
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


      const firstIsOverdue =
        firstFollowUp
          .is_overdue &&
        firstFollowUp.status ===
          'PENDING'

      const secondIsOverdue =
        secondFollowUp
          .is_overdue &&
        secondFollowUp.status ===
          'PENDING'


      if (
        firstIsOverdue &&
        !secondIsOverdue
      ) {
        return -1
      }


      if (
        secondIsOverdue &&
        !firstIsOverdue
      ) {
        return 1
      }


      if (
        firstFollowUp.status ===
          'PENDING' &&
        secondFollowUp.status !==
          'PENDING'
      ) {
        return -1
      }


      if (
        secondFollowUp.status ===
          'PENDING' &&
        firstFollowUp.status !==
          'PENDING'
      ) {
        return 1
      }


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


  const isSalesManager =
    currentUser?.role ===
    'SALES_MANAGER'


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


  const pageTitle =
    isSalesRepresentative
      ? 'My Follow-ups'
      : isSalesManager
        ? 'Team Follow-ups'
        : 'Follow-ups'


  const pageDescription =
    isSalesRepresentative
      ? 'Track upcoming, overdue and completed actions for your leads.'
      : isSalesManager
        ? 'Monitor follow-up activity across the sales team.'
        : 'Track follow-up activity across accessible leads.'


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
            1500,

          mx:
            'auto',
        }}
      >
        {/*
          HEADER
        */}

        <Stack
          direction={{
            xs:
              'column',

            sm:
              'row',
          }}
          sx={{
            justifyContent:
              'space-between',

            alignItems: {
              xs:
                'flex-start',

              sm:
                'center',
            },

            gap:
              2,

            mb:
              3,
          }}
        >
          <Box>
            <Typography
              sx={{
                color:
                  '#172033',

                fontSize: {
                  xs:
                    27,

                  md:
                    30,
                },

                fontWeight:
                  700,

                lineHeight:
                  1.2,

                letterSpacing:
                  '-0.02em',
              }}
            >
              {pageTitle}
            </Typography>


            <Typography
              sx={{
                mt:
                  0.65,

                color:
                  '#667085',

                fontSize:
                  13.5,

                lineHeight:
                  1.5,
              }}
            >
              {pageDescription}
            </Typography>
          </Box>


          <Button
            variant="outlined"
            startIcon={
              <RefreshRounded />
            }
            onClick={() =>
              void loadFollowUps()
            }
            disabled={
              isLoading
            }
            sx={{
              bgcolor:
                '#ffffff',
            }}
          >
            Refresh
          </Button>
        </Stack>


        {error && (
          <Alert
            severity="error"
            sx={{
              mb:
                2.5,
            }}
          >
            {error}
          </Alert>
        )}


        {/*
          SUMMARY STRIP
        */}

        <Card
          variant="outlined"
          sx={{
            mb:
              2.5,

            borderColor:
              '#e4e8ef',

            borderRadius:
              '12px',

            boxShadow:
              '0 2px 8px rgba(15, 23, 42, 0.035)',

            overflow:
              'hidden',
          }}
        >
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  'repeat(2, 1fr)',

                md:
                  'repeat(4, 1fr)',
              },
            }}
          >
            {[
              {
                label:
                  'Total Follow-ups',

                value:
                  followUps.length,
              },

              {
                label:
                  'Pending',

                value:
                  pendingCount,
              },

              {
                label:
                  'Overdue',

                value:
                  overdueCount,
              },

              {
                label:
                  'Completed',

                value:
                  completedCount,
              },
            ].map(
              (
                item,
                index,
              ) => (
                <Box
                  key={
                    item.label
                  }
                  sx={{
                    minHeight:
                      88,

                    px: {
                      xs:
                        2.25,

                      md:
                        2.75,
                    },

                    py:
                      2,

                    display:
                      'flex',

                    flexDirection:
                      'column',

                    justifyContent:
                      'center',

                    borderRight: {
                      xs:
                        index %
                          2 ===
                        0
                          ? '1px solid #edf0f4'
                          : 'none',

                      md:
                        index <
                        3
                          ? '1px solid #edf0f4'
                          : 'none',
                    },

                    borderBottom: {
                      xs:
                        index <
                        2
                          ? '1px solid #edf0f4'
                          : 'none',

                      md:
                        'none',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        '#667085',

                      fontSize:
                        12.5,

                      fontWeight:
                        500,
                    }}
                  >
                    {item.label}
                  </Typography>


                  <Typography
                    sx={{
                      mt:
                        0.4,

                      color:
                        item.label ===
                          'Overdue' &&
                        overdueCount >
                          0
                          ? 'error.main'
                          : '#172033',

                      fontSize:
                        24,

                      fontWeight:
                        700,

                      lineHeight:
                        1.2,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ),
            )}
          </Box>
        </Card>


        {/*
          FILTERS
        */}

        <Card
          variant="outlined"
          sx={{
            mb:
              2.5,

            p:
              1.75,

            borderColor:
              '#e4e8ef',

            borderRadius:
              '12px',

            boxShadow:
              '0 2px 8px rgba(15, 23, 42, 0.025)',
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
              1.25
            }
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search follow-up, lead, company or assignee..."
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
                input: {
                  startAdornment:
                    (
                      <InputAdornment position="start">
                        <SearchRounded
                          sx={{
                            color:
                              '#7a8699',

                            fontSize:
                              20,
                          }}
                        />
                      </InputAdornment>
                    ),
                },
              }}
            />


            <FormControl
              size="small"
              sx={{
                minWidth:
                  170,
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
                <MenuItem value="ALL">
                  All
                </MenuItem>

                <MenuItem value="UPCOMING">
                  Upcoming
                </MenuItem>

                <MenuItem value="OVERDUE">
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
                <MenuItem value="ALL">
                  All statuses
                </MenuItem>

                <MenuItem value="PENDING">
                  Pending
                </MenuItem>

                <MenuItem value="COMPLETED">
                  Completed
                </MenuItem>

                <MenuItem value="CANCELLED">
                  Cancelled
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Card>


        {/*
          FOLLOW-UP LIST
        */}

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

                md:
                  2.75,
              },

              py:
                2,
            }}
          >
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
                      15,

                    fontWeight:
                      700,
                  }}
                >
                  Follow-up List
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.2,

                    color:
                      '#7a8699',

                    fontSize:
                      11.5,
                  }}
                >
                  {isSalesRepresentative
                    ? 'Actions scheduled for your assigned leads'
                    : 'Sales team follow-up records'}
                </Typography>
              </Box>


              {!isLoading && (
                <Typography
                  sx={{
                    color:
                      '#667085',

                    fontSize:
                      12,
                  }}
                >
                  {filteredFollowUps.length}{' '}
                  {filteredFollowUps.length ===
                  1
                    ? 'follow-up'
                    : 'follow-ups'}
                </Typography>
              )}
            </Stack>
          </Box>


          <Divider />


          {isLoading ? (
            <Box
              sx={{
                minHeight:
                  220,

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
                  Loading follow-ups...
                </Typography>
              </Stack>
            </Box>
          ) : filteredFollowUps.length ===
            0 ? (
            <Box
              sx={{
                py:
                  6,

                px:
                  3,

                textAlign:
                  'center',
              }}
            >
              <CalendarTodayRounded
                sx={{
                  color:
                    '#98a2b3',

                  fontSize:
                    34,
                }}
              />

              <Typography
                sx={{
                  mt:
                    1.25,

                  color:
                    '#172033',

                  fontSize:
                    14,

                  fontWeight:
                    600,
                }}
              >
                No follow-ups found
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.4,

                  color:
                    '#7a8699',

                  fontSize:
                    12.5,
                }}
              >
                Try changing your search or filters.
              </Typography>
            </Box>
          ) : (
            <Stack
              divider={
                <Divider
                  flexItem
                />
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


                  const isOverdue =
                    followUp.status ===
                      'PENDING' &&
                    followUp.is_overdue


                  return (
                    <Box
                      key={
                        followUp.id
                      }
                      onClick={() =>
                        navigate(
                          `/follow-ups/${followUp.id}`,
                        )
                      }
                      sx={{
                        px: {
                          xs:
                            2.25,

                          md:
                            2.75,
                        },

                        py:
                          1.75,

                        cursor:
                          'pointer',

                        transition:
                          'background-color 120ms ease',

                        '&:hover':
                          {
                            bgcolor:
                              '#fafcff',
                          },
                      }}
                    >
                      <Box
                        sx={{
                          display:
                            'grid',

                          gridTemplateColumns: {
                            xs:
                              '1fr',

                            md:
                              'minmax(240px, 1.25fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr) minmax(120px, 0.45fr)',
                          },

                          gap: {
                            xs:
                              1.5,

                            md:
                              2.5,
                          },

                          alignItems:
                            'center',
                        }}
                      >
                        {/*
                          FOLLOW-UP
                        */}

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
                              mb:
                                0.4,

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

                                fontSize:
                                  13.5,

                                fontWeight:
                                  600,

                                lineHeight:
                                  1.4,
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
                              variant="outlined"
                              sx={{
                                bgcolor:
                                  '#ffffff',

                                fontSize:
                                  10.5,
                              }}
                            />
                          </Stack>


                          <Typography
                            sx={{
                              color:
                                '#475467',

                              fontSize:
                                12.5,

                              fontWeight:
                                500,
                            }}
                          >
                            {lead.contact_name}
                          </Typography>


                          <Typography
                            sx={{
                              mt:
                                0.15,

                              color:
                                '#98a2b3',

                              fontSize:
                                11.5,

                              overflow:
                                'hidden',

                              textOverflow:
                                'ellipsis',

                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {lead.company_name}
                          </Typography>


                          {followUp.description && (
                            <Typography
                              sx={{
                                mt:
                                  0.7,

                                color:
                                  '#667085',

                                fontSize:
                                  11.5,

                                lineHeight:
                                  1.5,

                                display:
                                  '-webkit-box',

                                WebkitLineClamp:
                                  2,

                                WebkitBoxOrient:
                                  'vertical',

                                overflow:
                                  'hidden',
                              }}
                            >
                              {followUp.description}
                            </Typography>
                          )}
                        </Box>


                        {/*
                          DUE
                        */}

                        <Box>
                          <Typography
                            sx={{
                              color:
                                '#98a2b3',

                              fontSize:
                                10.5,

                              fontWeight:
                                600,

                              textTransform:
                                'uppercase',

                              letterSpacing:
                                '0.04em',
                            }}
                          >
                            Due
                          </Typography>

                          <Typography
                            sx={{
                              mt:
                                0.4,

                              color:
                                isOverdue
                                  ? 'error.main'
                                  : '#475467',

                              fontSize:
                                12,

                              fontWeight:
                                isOverdue
                                  ? 600
                                  : 500,

                              lineHeight:
                                1.45,
                            }}
                          >
                            {formatDate(
                              followUp.due_date,
                            )}
                          </Typography>
                        </Box>


                        {/*
                          ASSIGNED
                        */}

                        <Box>
                          <Typography
                            sx={{
                              color:
                                '#98a2b3',

                              fontSize:
                                10.5,

                              fontWeight:
                                600,

                              textTransform:
                                'uppercase',

                              letterSpacing:
                                '0.04em',
                            }}
                          >
                            Assigned To
                          </Typography>

                          <Typography
                            sx={{
                              mt:
                                0.4,

                              color:
                                '#475467',

                              fontSize:
                                12,

                              fontWeight:
                                500,
                            }}
                          >
                            {followUp.assigned_to_name ||
                              'Unassigned'}
                          </Typography>


                          <Typography
                            sx={{
                              mt:
                                0.2,

                              color:
                                '#98a2b3',

                              fontSize:
                                10.5,
                            }}
                          >
                            Created by{' '}
                            {followUp.created_by_name}
                          </Typography>
                        </Box>


                        {/*
                          ACTION
                        */}

                        <Box
                          sx={{
                            textAlign: {
                              xs:
                                'left',

                              md:
                                'right',
                            },
                          }}
                        >
                          <Button
                            size="small"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation()

                              navigate(
                                `/follow-ups/${followUp.id}`,
                              )
                            }}
                            sx={{
                              minHeight:
                                32,

                              px:
                                1.25,

                              fontSize:
                                12,
                            }}
                          >
                            Open
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )
                },
              )}
            </Stack>
          )}
        </Card>
      </Box>
    </Box>
  )
}


export default FollowUpsPage