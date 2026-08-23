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
  CallRounded,
  ChatBubbleOutlineRounded,
  EventRounded,
  GroupsRounded,
  MailOutlineRounded,
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
  getLeadCommunications,
  getLeadFollowUps,
  getLeads,
  type Communication,
  type CommunicationType,
  type FollowUp,
  type Lead,
} from '../services/crm'


type ActivityFilter =
  | 'ALL'
  | 'COMMUNICATION'
  | 'FOLLOW_UP'


type ActivityItem =
  | {
      type: 'COMMUNICATION'
      id: string
      date: string
      lead: Lead
      communication: Communication
    }
  | {
      type: 'FOLLOW_UP'
      id: string
      date: string
      lead: Lead
      followUp: FollowUp
    }


function formatDate(
  value: string,
) {
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


function getCommunicationIcon(
  type: CommunicationType,
) {
  switch (type) {
    case 'CALL':
      return (
        <CallRounded
          fontSize="small"
        />
      )

    case 'EMAIL':
      return (
        <MailOutlineRounded
          fontSize="small"
        />
      )

    case 'MEETING':
      return (
        <GroupsRounded
          fontSize="small"
        />
      )

    case 'WHATSAPP':
      return (
        <ChatBubbleOutlineRounded
          fontSize="small"
        />
      )

    default:
      return (
        <CallRounded
          fontSize="small"
        />
      )
  }
}


function ActivityPage() {
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
    activities,
    setActivities,
  ] =
    useState<ActivityItem[]>(
      [],
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
    search,
    setSearch,
  ] =
    useState('')


  const [
    activityFilter,
    setActivityFilter,
  ] =
    useState<ActivityFilter>(
      'ALL',
    )


  const loadActivities =
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


        const activityGroups =
          await Promise.all(
            leads.map(
              async (
                lead,
              ) => {
                const [
                  communications,
                  followUps,
                ] =
                  await Promise.all([
                    getLeadCommunications(
                      lead.id,
                    ),

                    getLeadFollowUps(
                      lead.id,
                    ),
                  ])


                const communicationActivities:
                ActivityItem[] =
                  communications.map(
                    (
                      communication,
                    ) => ({
                      type:
                        'COMMUNICATION',

                      id:
                        `communication-${communication.id}`,

                      date:
                        communication.communication_date,

                      lead,

                      communication,
                    }),
                  )


                const followUpActivities:
                ActivityItem[] =
                  followUps.map(
                    (
                      followUp,
                    ) => ({
                      type:
                        'FOLLOW_UP',

                      id:
                        `follow-up-${followUp.id}`,

                      date:
                        followUp.created_at,

                      lead,

                      followUp,
                    }),
                  )


                return [
                  ...communicationActivities,
                  ...followUpActivities,
                ]
              },
            ),
          )


        const combinedActivities =
          activityGroups
            .flat()
            .sort(
              (
                first,
                second,
              ) =>
                new Date(
                  second.date,
                ).getTime() -
                new Date(
                  first.date,
                ).getTime(),
            )


        setCurrentUser(
          user,
        )

        setActivities(
          combinedActivities,
        )
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to load activity.',
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  useEffect(
    () => {
      void loadActivities()
    },
    [],
  )


  const isSalesRepresentative =
    currentUser?.role ===
    'SALES_REP'


  const isSalesManager =
    currentUser?.role ===
    'SALES_MANAGER'


  const communicationCount =
    useMemo(
      () =>
        activities.filter(
          (
            activity,
          ) =>
            activity.type ===
            'COMMUNICATION',
        ).length,
      [
        activities,
      ],
    )


  const followUpCount =
    useMemo(
      () =>
        activities.filter(
          (
            activity,
          ) =>
            activity.type ===
            'FOLLOW_UP',
        ).length,
      [
        activities,
      ],
    )


  const filteredActivities =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase()


        return activities.filter(
          (
            activity,
          ) => {
            const matchesType =
              activityFilter ===
                'ALL' ||
              activity.type ===
                activityFilter


            const leadMatches =
              activity.lead.contact_name
                .toLowerCase()
                .includes(
                  query,
                ) ||
              activity.lead.company_name
                .toLowerCase()
                .includes(
                  query,
                )


            let activityMatches =
              false


            if (
              activity.type ===
              'COMMUNICATION'
            ) {
              activityMatches =
                activity.communication.summary
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                activity.communication.notes
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                activity.communication
                  .communication_type_display
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                (
                  activity.communication
                    .created_by_name ||
                  ''
                )
                  .toLowerCase()
                  .includes(
                    query,
                  )
            }


            if (
              activity.type ===
              'FOLLOW_UP'
            ) {
              activityMatches =
                activity.followUp.title
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                activity.followUp.description
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                (
                  activity.followUp
                    .assigned_to_name ||
                  ''
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ) ||
                (
                  activity.followUp
                    .created_by_name ||
                  ''
                )
                  .toLowerCase()
                  .includes(
                    query,
                  )
            }


            const matchesSearch =
              !query ||
              leadMatches ||
              activityMatches


            return (
              matchesType &&
              matchesSearch
            )
          },
        )
      },
      [
        activities,
        activityFilter,
        search,
      ],
    )


  const pageTitle =
    isSalesRepresentative
      ? 'My Activity'
      : isSalesManager
        ? 'Team Activity'
        : 'Lead Activity'


  const pageDescription =
    isSalesRepresentative
      ? 'Review communication and follow-up activity across your assigned leads.'
      : isSalesManager
        ? 'Monitor communication and follow-up activity across the sales team.'
        : 'Review communication and follow-up activity across accessible leads.'


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
              void loadActivities()
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
          SUMMARY
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
                  '1fr',

                sm:
                  'repeat(3, 1fr)',
              },
            }}
          >
            {[
              {
                label:
                  'Total Activity',

                value:
                  activities.length,
              },

              {
                label:
                  'Communications',

                value:
                  communicationCount,
              },

              {
                label:
                  'Follow-ups',

                value:
                  followUpCount,
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
                        'none',

                      sm:
                        index <
                        2
                          ? '1px solid #edf0f4'
                          : 'none',
                    },

                    borderBottom: {
                      xs:
                        index <
                        2
                          ? '1px solid #edf0f4'
                          : 'none',

                      sm:
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
                        '#172033',

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
            p:
              1.75,

            mb:
              2.5,

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

              md:
                'row',
            }}
            spacing={
              1.25
            }
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search lead, company, representative or activity..."
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
                  210,
              }}
            >
              <InputLabel>
                Activity type
              </InputLabel>

              <Select
                value={
                  activityFilter
                }
                label="Activity type"
                onChange={(
                  event,
                ) =>
                  setActivityFilter(
                    event.target
                      .value as ActivityFilter,
                  )
                }
              >
                <MenuItem value="ALL">
                  All activity
                </MenuItem>

                <MenuItem value="COMMUNICATION">
                  Communications
                </MenuItem>

                <MenuItem value="FOLLOW_UP">
                  Follow-ups
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Card>


        {/*
          ACTIVITY FEED
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
                  Activity Feed
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
                    ? 'Recent activity across your assigned leads'
                    : 'Recent sales lead activity'}
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
                  {filteredActivities.length}{' '}
                  {filteredActivities.length ===
                  1
                    ? 'event'
                    : 'events'}
                </Typography>
              )}
            </Stack>
          </Box>


          <Divider />


          {isLoading ? (
            <Box
              sx={{
                minHeight:
                  240,

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
                  Loading activity...
                </Typography>
              </Stack>
            </Box>
          ) : filteredActivities.length ===
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
              <EventRounded
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
                No activity found
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
                Try changing your search or filter.
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
              {filteredActivities.map(
                (
                  activity,
                ) => {
                  if (
                    activity.type ===
                    'COMMUNICATION'
                  ) {
                    const {
                      communication,
                      lead,
                    } =
                      activity


                    return (
                      <Box
                        key={
                          activity.id
                        }
                        onClick={() =>
                          navigate(
                            `/leads/${lead.id}?tab=communications`,
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
                                'minmax(300px, 1.4fr) minmax(170px, 0.65fr) minmax(180px, 0.65fr) 80px',
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
                          <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{
                              minWidth:
                                0,

                              alignItems:
                                'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                width:
                                  36,

                                height:
                                  36,

                                borderRadius:
                                  '9px',

                                flexShrink:
                                  0,

                                display:
                                  'flex',

                                alignItems:
                                  'center',

                                justifyContent:
                                  'center',

                                bgcolor:
                                  '#eef4ff',

                                color:
                                  '#0b5cff',
                              }}
                            >
                              {getCommunicationIcon(
                                communication.communication_type,
                              )}
                            </Box>


                            <Box
                              sx={{
                                minWidth:
                                  0,
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={0.8}
                                sx={{
                                  alignItems:
                                    'center',

                                  flexWrap:
                                    'wrap',

                                  mb:
                                    0.35,
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
                                  }}
                                >
                                  {communication.summary}
                                </Typography>


                                <Chip
                                  size="small"
                                  label={
                                    communication.communication_type_display
                                  }
                                  color="primary"
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
                                }}
                              >
                                {lead.company_name}
                              </Typography>


                              {communication.notes && (
                                <Typography
                                  sx={{
                                    mt:
                                      0.65,

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
                                  {communication.notes}
                                </Typography>
                              )}
                            </Box>
                          </Stack>


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
                              Date
                            </Typography>


                            <Stack
                              direction="row"
                              spacing={0.6}
                              sx={{
                                mt:
                                  0.4,

                                alignItems:
                                  'center',

                                color:
                                  '#475467',
                              }}
                            >
                              <CalendarTodayRounded
                                sx={{
                                  fontSize:
                                    15,
                                }}
                              />

                              <Typography
                                sx={{
                                  fontSize:
                                    11.5,

                                  lineHeight:
                                    1.45,
                                }}
                              >
                                {formatDate(
                                  communication.communication_date,
                                )}
                              </Typography>
                            </Stack>
                          </Box>


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
                              Recorded By
                            </Typography>


                            <Stack
                              direction="row"
                              spacing={0.6}
                              sx={{
                                mt:
                                  0.4,

                                alignItems:
                                  'center',

                                color:
                                  '#475467',
                              }}
                            >
                              <PersonOutlineRounded
                                sx={{
                                  fontSize:
                                    16,
                                }}
                              />

                              <Typography
                                sx={{
                                  fontSize:
                                    12,

                                  fontWeight:
                                    500,
                                }}
                              >
                                {communication.created_by_name ||
                                  'Unknown'}
                              </Typography>
                            </Stack>
                          </Box>


                          <Button
                            size="small"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation()

                              navigate(
                                `/leads/${lead.id}?tab=communications`,
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
                    )
                  }


                  const {
                    followUp,
                    lead,
                  } =
                    activity


                  const isOverdue =
                    followUp.status ===
                      'PENDING' &&
                    followUp.is_overdue


                  return (
                    <Box
                      key={
                        activity.id
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
                              'minmax(300px, 1.4fr) minmax(170px, 0.65fr) minmax(180px, 0.65fr) 80px',
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
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{
                            minWidth:
                              0,

                            alignItems:
                              'flex-start',
                          }}
                        >
                          <Box
                            sx={{
                              width:
                                36,

                              height:
                                36,

                              borderRadius:
                                '9px',

                              flexShrink:
                                0,

                              display:
                                'flex',

                              alignItems:
                                'center',

                              justifyContent:
                                'center',

                              bgcolor:
                                isOverdue
                                  ? '#fef3f2'
                                  : '#ecfdf3',

                              color:
                                isOverdue
                                  ? '#d92d20'
                                  : '#039855',
                            }}
                          >
                            <EventRounded
                              fontSize="small"
                            />
                          </Box>


                          <Box
                            sx={{
                              minWidth:
                                0,
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={0.8}
                              sx={{
                                alignItems:
                                  'center',

                                flexWrap:
                                  'wrap',

                                mb:
                                  0.35,
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
                                }}
                              >
                                {followUp.title}
                              </Typography>


                              <Chip
                                size="small"
                                label={
                                  isOverdue
                                    ? 'Overdue'
                                    : 'Follow-up'
                                }
                                color={
                                  isOverdue
                                    ? 'error'
                                    : 'success'
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
                              }}
                            >
                              {lead.company_name}
                            </Typography>


                            {followUp.description && (
                              <Typography
                                sx={{
                                  mt:
                                    0.65,

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
                        </Stack>


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


                          <Stack
                            direction="row"
                            spacing={0.6}
                            sx={{
                              mt:
                                0.4,

                              alignItems:
                                'center',

                              color:
                                isOverdue
                                  ? 'error.main'
                                  : '#475467',
                            }}
                          >
                            <CalendarTodayRounded
                              sx={{
                                fontSize:
                                  15,
                              }}
                            />

                            <Typography
                              sx={{
                                fontSize:
                                  11.5,

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
                          </Stack>
                        </Box>


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


                          <Stack
                            direction="row"
                            spacing={0.6}
                            sx={{
                              mt:
                                0.4,

                              alignItems:
                                'center',

                              color:
                                '#475467',
                            }}
                          >
                            <PersonOutlineRounded
                              sx={{
                                fontSize:
                                  16,
                              }}
                            />

                            <Typography
                              sx={{
                                fontSize:
                                  12,

                                fontWeight:
                                  500,
                              }}
                            >
                              {followUp.assigned_to_name ||
                                'Unassigned'}
                            </Typography>
                          </Stack>
                        </Box>


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


export default ActivityPage