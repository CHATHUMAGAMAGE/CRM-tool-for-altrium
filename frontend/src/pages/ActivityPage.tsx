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

          gap: 2,

          mb: 4,
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
              ? 'My Activity'
              : 'Lead Activity'}
          </Typography>

          <Typography
            color="text.secondary"
          >
            {isSalesRepresentative
              ? 'Review communications and follow-up activity across your assigned leads.'
              : 'Review communications and follow-up activity across accessible leads.'}
          </Typography>
        </Box>


        <Button
          startIcon={
            <RefreshRounded />
          }
          onClick={() =>
            void loadActivities()
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
                'repeat(3, 1fr)',
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
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Total Activity
          </Typography>

          <Typography
            variant="h4"
            sx={{
              mt:
                0.5,

              fontWeight:
                800,
            }}
          >
            {
              activities.length
            }
          </Typography>
        </Card>


        <Card
          variant="outlined"
          sx={{
            p:
              2.5,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Communications
          </Typography>

          <Typography
            variant="h4"
            sx={{
              mt:
                0.5,

              fontWeight:
                800,
            }}
          >
            {
              communicationCount
            }
          </Typography>
        </Card>


        <Card
          variant="outlined"
          sx={{
            p:
              2.5,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Follow-ups
          </Typography>

          <Typography
            variant="h4"
            sx={{
              mt:
                0.5,

              fontWeight:
                800,
            }}
          >
            {
              followUpCount
            }
          </Typography>
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

            md:
              'row',
          }}
          spacing={
            2
          }
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search lead, company or activity"
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
                220,
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
              <MenuItem
                value="ALL"
              >
                All activity
              </MenuItem>

              <MenuItem
                value="COMMUNICATION"
              >
                Communications
              </MenuItem>

              <MenuItem
                value="FOLLOW_UP"
              >
                Follow-ups
              </MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Card>


      {/* TIMELINE */}

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
              Loading activity...
            </Typography>
          </Stack>
        </Box>
      ) : filteredActivities.length ===
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
          <Typography
            variant="h6"
            sx={{
              fontWeight:
                800,
            }}
          >
            No activity found
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt:
                0.75,
            }}
          >
            Try changing your search or filter.
          </Typography>
        </Card>
      ) : (
        <Stack
          spacing={
            2
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
                  <Card
                    key={
                      activity.id
                    }
                    variant="outlined"
                    onClick={() =>
                      navigate(
                        `/leads/${lead.id}?tab=communications`,
                      )
                    }
                    sx={{
                      p:
                        2.5,

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
                      <Stack
                        direction="row"
                        spacing={
                          2
                        }
                        sx={{
                          alignItems:
                            'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            width:
                              42,

                            height:
                              42,

                            borderRadius:
                              1.5,

                            flexShrink:
                              0,

                            display:
                              'flex',

                            alignItems:
                              'center',

                            justifyContent:
                              'center',

                            bgcolor:
                              'primary.main',

                            color:
                              'common.white',
                          }}
                        >
                          {getCommunicationIcon(
                            communication.communication_type,
                          )}
                        </Box>


                        <Box>
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
                                0.75,
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                communication.communication_type_display
                              }
                              color="primary"
                              variant="outlined"
                            />

                            <Typography
                              sx={{
                                fontWeight:
                                  800,
                              }}
                            >
                              {
                                communication.summary
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


                          {communication.notes && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt:
                                  1.25,

                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {
                                communication.notes
                              }
                            </Typography>
                          )}
                        </Box>
                      </Stack>


                      <Stack
                        spacing={
                          0.75
                        }
                        sx={{
                          minWidth: {
                            xs:
                              0,

                            md:
                              250,
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
                              'text.secondary',
                          }}
                        >
                          <CalendarTodayRounded
                            sx={{
                              fontSize:
                                17,
                            }}
                          />

                          <Typography
                            variant="body2"
                          >
                            {formatDate(
                              communication.communication_date,
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
                                18,
                            }}
                          />

                          <Typography
                            variant="body2"
                          >
                            Recorded by{' '}
                            {
                              communication.created_by_name
                            }
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Card>
                )
              }


              const {
                followUp,
                lead,
              } =
                activity


              return (
                <Card
                  key={
                    activity.id
                  }
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      `/follow-ups/${followUp.id}`,
                    )
                  }
                  sx={{
                    p:
                      2.5,

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
                    <Stack
                      direction="row"
                      spacing={
                        2
                      }
                      sx={{
                        alignItems:
                          'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          width:
                            42,

                          height:
                            42,

                          borderRadius:
                            1.5,

                          flexShrink:
                            0,

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',

                          bgcolor:
                            followUp.is_overdue &&
                            followUp.status ===
                              'PENDING'
                              ? 'error.main'
                              : 'info.main',

                          color:
                            'common.white',
                        }}
                      >
                        <EventRounded
                          fontSize="small"
                        />
                      </Box>


                      <Box>
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
                              0.75,
                          }}
                        >
                          <Chip
                            size="small"
                            label="Follow-up"
                            color="info"
                            variant="outlined"
                          />

                          <Typography
                            sx={{
                              fontWeight:
                                800,
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
                                1.25,

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
                    </Stack>


                    <Stack
                      spacing={
                        0.75
                      }
                      sx={{
                        minWidth: {
                          xs:
                            0,

                          md:
                            250,
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
                              17,
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
                              18,
                          }}
                        />

                        <Typography
                          variant="body2"
                        >
                          Assigned to{' '}
                          {followUp.assigned_to_name ||
                            'Unassigned'}
                        </Typography>
                      </Stack>
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


export default ActivityPage