import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'

import {
  AccessTimeRounded,
  CheckCircleOutlineRounded,
  EventRounded,
  GroupOutlined,
  PersonAddOutlined,
  RefreshRounded,
  WarningAmberRounded,
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
  type Lead,
  type LeadStatus,
} from '../services/crm'


const ACTIVE_LEAD_STATUSES:
LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
]


type SalesRepDashboardFocus =
  | 'DEFAULT'
  | 'ACTIVE_LEADS'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'QUALIFIED'


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
      return 'info'

    case 'PROPOSAL':
      return 'warning'

    case 'QUALIFIED':
    case 'WON':
      return 'success'

    case 'LOST':
    case 'DISQUALIFIED':
      return 'error'

    case 'NEW':
    default:
      return 'default'
  }
}


function getStatusLabel(
  status: LeadStatus,
) {
  switch (status) {
    case 'NEW':
      return 'New'

    case 'CONTACTED':
      return 'Contacted'

    case 'QUALIFIED':
      return 'Qualified'

    case 'PROPOSAL':
      return 'Proposal'

    case 'WON':
      return 'Won'

    case 'LOST':
      return 'Lost'

    case 'DISQUALIFIED':
      return 'Disqualified'

    default:
      return status
  }
}


function formatDate(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  return new Date(
    value,
  ).toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  )
}


function formatDateTime(
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
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}


function getLeadInitials(
  name: string,
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)

  return (
    parts
      .map(
        (
          part,
        ) =>
          part
            .charAt(0)
            .toUpperCase(),
      )
      .join('') ||
    'L'
  )
}


function DashboardPage() {
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
    leads,
    setLeads,
  ] =
    useState<Lead[]>([])


  const [
    followUps,
    setFollowUps,
  ] =
    useState<FollowUp[]>([])


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
    dashboardFocus,
    setDashboardFocus,
  ] =
    useState<SalesRepDashboardFocus>(
      'DEFAULT',
    )


  const loadDashboard =
    async () => {
      setIsLoading(
        true,
      )

      setError(
        '',
      )

      try {
        const user =
          await getCurrentUser()

        setCurrentUser(
          user,
        )

        if (
          user.role ===
          'TECH_LEAD'
        ) {
          navigate(
            '/technical-assessments',
            {
              replace:
                true,
            },
          )

          return
        }

        if (
          user.role ===
          'FINANCIAL_OFFICER'
        ) {
          navigate(
            '/financial-assessments',
            {
              replace:
                true,
            },
          )

          return
        }

        if (
          user.role ===
          'ADMIN'
        ) {
          navigate(
            '/admin',
            {
              replace:
                true,
            },
          )

          return
        }

        const leadData =
          await getLeads()

        let followUpData:
        FollowUp[] = []

        if (
          user.role ===
          'SALES_REP'
        ) {
          const assignedActiveLeads =
            leadData.filter(
              (
                leadItem,
              ) =>
                leadItem.assigned_to ===
                  user.id &&
                ACTIVE_LEAD_STATUSES.includes(
                  leadItem.status,
                ),
            )

          const followUpGroups =
            await Promise.all(
              assignedActiveLeads.map(
                (
                  leadItem,
                ) =>
                  getLeadFollowUps(
                    leadItem.id,
                  ),
              ),
            )

          followUpData =
            followUpGroups.flat()
        }

        setLeads(
          leadData,
        )

        setFollowUps(
          followUpData,
        )
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to load dashboard data.',
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  useEffect(
    () => {
      void loadDashboard()
    },
    [],
  )


  const isSalesRepresentative =
    currentUser?.role ===
    'SALES_REP'


  const isSalesManager =
    currentUser?.role ===
    'SALES_MANAGER'


  const assignedLeadCount =
    useMemo(
      () => {
        if (
          isSalesRepresentative &&
          currentUser
        ) {
          return leads.filter(
            (
              lead,
            ) =>
              lead.assigned_to ===
              currentUser.id,
          ).length
        }

        return leads.filter(
          (
            lead,
          ) =>
            lead.assigned_to !==
            null,
        ).length
      },
      [
        leads,
        currentUser,
        isSalesRepresentative,
      ],
    )


  const activeLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            ACTIVE_LEAD_STATUSES.includes(
              lead.status,
            ),
        ).length,
      [
        leads,
      ],
    )


  const unassignedLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            lead.assigned_to ===
              null &&
            ACTIVE_LEAD_STATUSES.includes(
              lead.status,
            ),
        ).length,
      [
        leads,
      ],
    )


  const qualifiedLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            lead.status ===
            'QUALIFIED',
        ).length,
      [
        leads,
      ],
    )


  const newLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            lead.status ===
            'NEW',
        ).length,
      [
        leads,
      ],
    )


  const contactedLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            lead.status ===
            'CONTACTED',
        ).length,
      [
        leads,
      ],
    )


  const proposalLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            lead.status ===
            'PROPOSAL',
        ).length,
      [
        leads,
      ],
    )


  const pendingFollowUps =
    useMemo(
      () =>
        followUps
          .filter(
            (
              followUp,
            ) =>
              followUp.status ===
              'PENDING',
          )
          .sort(
            (
              first,
              second,
            ) =>
              new Date(
                first.due_date,
              ).getTime() -
              new Date(
                second.due_date,
              ).getTime(),
          ),
      [
        followUps,
      ],
    )


  const overdueFollowUps =
    useMemo(
      () =>
        pendingFollowUps.filter(
          (
            followUp,
          ) =>
            followUp.is_overdue,
        ),
      [
        pendingFollowUps,
      ],
    )


  const overdueFollowUpCount =
    overdueFollowUps.length


  const dueSoonFollowUps =
    useMemo(
      () => {
        const now =
          Date.now()

        const dueSoonLimit =
          now +
          48 *
            60 *
            60 *
            1000

        return pendingFollowUps.filter(
          (
            followUp,
          ) => {
            if (
              followUp.is_overdue
            ) {
              return false
            }

            const dueTime =
              new Date(
                followUp.due_date,
              ).getTime()

            return (
              dueTime >= now &&
              dueTime <=
                dueSoonLimit
            )
          },
        )
      },
      [
        pendingFollowUps,
      ],
    )


  const dueSoonFollowUpCount =
    dueSoonFollowUps.length


  const incomingFollowUps =
    useMemo(
      () => {
        if (
          dashboardFocus ===
          'OVERDUE'
        ) {
          return overdueFollowUps
        }

        if (
          dashboardFocus ===
          'DUE_SOON'
        ) {
          return dueSoonFollowUps
        }

        return pendingFollowUps.slice(
          0,
          5,
        )
      },
      [
        dashboardFocus,
        overdueFollowUps,
        dueSoonFollowUps,
        pendingFollowUps,
      ],
    )


  const workloadLevel =
    activeLeadCount <=
      2
      ? 'Available'
      : activeLeadCount <=
          5
        ? 'Moderate'
        : 'Busy'


  const workloadProgress =
    Math.min(
      100,
      Math.round(
        (
          activeLeadCount /
          6
        ) *
          100,
      ),
    )


  const recentLeads =
    useMemo(
      () =>
        [
          ...leads,
        ]
          .sort(
            (
              first,
              second,
            ) =>
              new Date(
                second.created_at,
              ).getTime() -
              new Date(
                first.created_at,
              ).getTime(),
          )
          .slice(
            0,
            5,
          ),
      [
        leads,
      ],
    )


  const focusedLeads =
    useMemo(
      () => {
        if (
          dashboardFocus ===
          'QUALIFIED'
        ) {
          return leads
            .filter(
              (
                lead,
              ) =>
                lead.status ===
                'QUALIFIED',
            )
            .sort(
              (
                first,
                second,
              ) =>
                new Date(
                  second.updated_at,
                ).getTime() -
                new Date(
                  first.updated_at,
                ).getTime(),
            )
        }

        if (
          dashboardFocus ===
          'ACTIVE_LEADS'
        ) {
          return leads
            .filter(
              (
                lead,
              ) =>
                ACTIVE_LEAD_STATUSES.includes(
                  lead.status,
                ),
            )
            .sort(
              (
                first,
                second,
              ) =>
                new Date(
                  second.updated_at,
                ).getTime() -
                new Date(
                  first.updated_at,
                ).getTime(),
            )
        }

        return recentLeads
      },
      [
        dashboardFocus,
        leads,
        recentLeads,
      ],
    )


  const scrollToDashboardSection =
    (
      sectionId:
        string,
    ) => {
      window.setTimeout(
        () => {
          document
            .getElementById(
              sectionId,
            )
            ?.scrollIntoView({
              behavior:
                'smooth',

              block:
                'start',
            })
        },
        0,
      )
    }


  const handleSalesRepKpiClick =
    (
      focus:
        SalesRepDashboardFocus,
    ) => {
      if (
        !isSalesRepresentative
      ) {
        return
      }

      setDashboardFocus(
        focus,
      )

      if (
        focus ===
          'DUE_SOON' ||
        focus ===
          'OVERDUE'
      ) {
        scrollToDashboardSection(
          'incoming-work',
        )

        return
      }

      scrollToDashboardSection(
        'my-leads',
      )
    }


  const clearDashboardFocus =
    () => {
      setDashboardFocus(
        'DEFAULT',
      )
    }


  const unassignedLeads =
    useMemo(
      () =>
        leads
          .filter(
            (
              lead,
            ) =>
              lead.assigned_to ===
                null &&
              ACTIVE_LEAD_STATUSES.includes(
                lead.status,
              ),
          )
          .sort(
            (
              first,
              second,
            ) =>
              new Date(
                second.created_at,
              ).getTime() -
              new Date(
                first.created_at,
              ).getTime(),
          )
          .slice(
            0,
            4,
          ),
      [
        leads,
      ],
    )


  const salesRepresentativeSummaryCards =
    isSalesRepresentative
      ? [
          {
            title:
              'Active Leads',

            value:
              activeLeadCount,

            focus:
              'ACTIVE_LEADS' as const,

            icon:
              (
                <GroupOutlined
                  color="primary"
                />
              ),
          },

          {
            title:
              'Due Soon',

            value:
              dueSoonFollowUpCount,

            focus:
              'DUE_SOON' as const,

            icon:
              (
                <AccessTimeRounded
                  color="primary"
                />
              ),
          },

          {
            title:
              'Overdue',

            value:
              overdueFollowUpCount,

            focus:
              'OVERDUE' as const,

            icon:
              (
                <WarningAmberRounded
                  color={
                    overdueFollowUpCount >
                    0
                      ? 'warning'
                      : 'primary'
                  }
                />
              ),
          },

          {
            title:
              'Qualified',

            value:
              qualifiedLeadCount,

            focus:
              'QUALIFIED' as const,

            icon:
              (
                <CheckCircleOutlineRounded
                  color="primary"
                />
              ),
          },
        ]
      : [
          {
            title:
              'Total Leads',

            focus:
              null,

            value:
              leads.length,

            icon:
              (
                <GroupOutlined
                  color="primary"
                />
              ),
          },

          {
            title:
              'Assigned Leads',

            focus:
              null,

            value:
              assignedLeadCount,

            icon:
              (
                <PersonAddOutlined
                  color="primary"
                />
              ),
          },

          {
            title:
              'Qualified Leads',

            focus:
              null,

            value:
              qualifiedLeadCount,

            icon:
              (
                <CheckCircleOutlineRounded
                  color="primary"
                />
              ),
          },
        ]


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
            4,
        },
      }}
    >
      <Box
        sx={{
          width:
            '100%',

          maxWidth:
            1480,

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
                    28,

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
              Dashboard
            </Typography>

            <Typography
              sx={{
                mt:
                  0.7,

                color:
                  'text.secondary',

                fontSize:
                  14,
              }}
            >
              {isSalesRepresentative
                ? 'Your ELEVEN CRM lead overview'
                : isSalesManager
                  ? 'Sales overview and lead assignments'
                  : 'ELEVEN CRM operational overview'}
            </Typography>
          </Box>


          <Stack
            direction="row"
            spacing={1.25}
          >
            <Button
              variant="outlined"
              startIcon={
                <RefreshRounded />
              }
              onClick={() =>
                void loadDashboard()
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


        {isLoading ? (
          <Box
            sx={{
              minHeight:
                380,

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
              <CircularProgress />

              <Typography
                sx={{
                  color:
                    'text.secondary',

                  fontSize:
                    13,
                }}
              >
                Loading dashboard...
              </Typography>
            </Stack>
          </Box>
        ) : isSalesManager ? (
          <>
            {/*
              MANAGER SUMMARY
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
                      'Total Leads',

                    value:
                      leads.length,

                    path:
                      '/leads?view=ALL',
                  },

                  {
                    label:
                      'Active',

                    value:
                      activeLeadCount,

                    path:
                      '/leads?view=ACTIVE',
                  },

                  {
                    label:
                      'Unassigned',

                    value:
                      unassignedLeadCount,

                    path:
                      '/leads?view=ACTIVE&assignee=UNASSIGNED',
                  },

                  {
                    label:
                      'Qualified',

                    value:
                      qualifiedLeadCount,

                    path:
                      '/leads?view=ACTIVE&status=QUALIFIED',
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
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate(
                          item.path,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                            'Enter' ||
                          event.key ===
                            ' '
                        ) {
                          event.preventDefault()

                          navigate(
                            item.path,
                          )
                        }
                      }}
                      sx={{
                        minHeight:
                          96,

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

                        cursor:
                          'pointer',

                        outline:
                          'none',

                        transition:
                          'background-color 160ms ease, box-shadow 160ms ease',

                        '&:hover':
                          {
                            bgcolor:
                              '#fafcff',

                            boxShadow:
                              'inset 0 0 0 1px #d6e4ff',
                          },

                        '&:focus-visible':
                          {
                            boxShadow:
                              'inset 0 0 0 2px #84adff',
                          },

                        borderRight:
                          index <
                          3
                            ? {
                                md:
                                  '1px solid #edf0f4',
                              }
                            : undefined,

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

                      <Typography
                        sx={{
                          mt:
                            0.55,

                          color:
                            '#1557d5',

                          fontSize:
                            10.5,

                          fontWeight:
                            600,
                        }}
                      >
                        Click to view
                      </Typography>
                    </Box>
                  ),
                )}
              </Box>
            </Card>


            {/*
              MAIN DASHBOARD GRID
            */}

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  lg:
                    'minmax(0, 1.65fr) minmax(300px, 0.65fr)',
                },

                gap:
                  2.5,

                alignItems:
                  'start',
              }}
            >
              {/*
                RECENT LEADS
              */}

              <Card
                variant="outlined"
                sx={{
                  borderColor:
                    '#e4e8ef',

                  borderRadius:
                    '12px',

                  boxShadow:
                    '0 2px 10px rgba(15, 23, 42, 0.04)',

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
                      2.2,
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
                            16,

                          fontWeight:
                            700,
                        }}
                      >
                        Recent Leads
                      </Typography>

                      <Typography
                        sx={{
                          mt:
                            0.25,

                          color:
                            'text.secondary',

                          fontSize:
                            12.5,
                        }}
                      >
                        Recently created lead records
                      </Typography>
                    </Box>


                    <Button
                      size="small"
                      onClick={() =>
                        navigate(
                          '/leads',
                        )
                      }
                      sx={{
                        minHeight:
                          34,

                        px:
                          1.25,

                        fontSize:
                          12.5,
                      }}
                    >
                      View All
                    </Button>
                  </Stack>
                </Box>


                <Divider />


                {recentLeads.length ===
                0 ? (
                  <Box
                    sx={{
                      px:
                        3,

                      py:
                        6,

                      textAlign:
                        'center',
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          13,
                      }}
                    >
                      No leads have been created yet.
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
                    {recentLeads.map(
                      (
                        lead,
                      ) => (
                        <Box
                          key={
                            lead.id
                          }
                          onClick={() =>
                            navigate(
                              `/leads/${lead.id}`,
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
                              1.55,

                            cursor:
                              'pointer',

                            '&:hover':
                              {
                                bgcolor:
                                  '#fafcff',
                              },
                          }}
                        >
                          <Stack
                            direction="row"
                            sx={{
                              alignItems:
                                'center',

                              justifyContent:
                                'space-between',

                              gap:
                                2,
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1.4}
                              sx={{
                                alignItems:
                                  'center',

                                minWidth:
                                  0,

                                flex:
                                  1,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width:
                                    38,

                                  height:
                                    38,

                                  bgcolor:
                                    '#edf2ff',

                                  color:
                                    '#1748bf',

                                  fontSize:
                                    12.5,

                                  fontWeight:
                                    700,

                                  flexShrink:
                                    0,
                                }}
                              >
                                {getLeadInitials(
                                  lead.contact_name,
                                )}
                              </Avatar>


                              <Box
                                sx={{
                                  minWidth:
                                    0,
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

                                    overflow:
                                      'hidden',

                                    textOverflow:
                                      'ellipsis',

                                    whiteSpace:
                                      'nowrap',
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

                                    overflow:
                                      'hidden',

                                    textOverflow:
                                      'ellipsis',

                                    whiteSpace:
                                      'nowrap',
                                  }}
                                >
                                  {lead.company_name}
                                  {' · '}
                                  {lead.assigned_to_name ||
                                    'Unassigned'}
                                </Typography>
                              </Box>
                            </Stack>


                            <Stack
                              direction="row"
                              spacing={1.5}
                              sx={{
                                alignItems:
                                  'center',

                                flexShrink:
                                  0,
                              }}
                            >
                              <Chip
                                size="small"
                                label={
                                  lead.status_display ||
                                  getStatusLabel(
                                    lead.status,
                                  )
                                }
                                color={
                                  getStatusColor(
                                    lead.status,
                                  )
                                }
                                variant="outlined"
                                sx={{
                                  bgcolor:
                                    '#ffffff',

                                  fontSize:
                                    11.5,
                                }}
                              />

                              <Typography
                                sx={{
                                  width:
                                    86,

                                  display: {
                                    xs:
                                      'none',

                                    sm:
                                      'block',
                                  },

                                  color:
                                    '#667085',

                                  fontSize:
                                    11.5,

                                  textAlign:
                                    'right',
                                }}
                              >
                                {formatDate(
                                  lead.created_at,
                                )}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      ),
                    )}
                  </Stack>
                )}
              </Card>


              {/*
                RIGHT COLUMN
              */}

              <Stack
                spacing={2.5}
              >
                {/*
                  ASSIGNMENT QUEUE
                */}

                <Card
                  variant="outlined"
                  sx={{
                    borderColor:
                      '#e4e8ef',

                    borderRadius:
                      '12px',

                    boxShadow:
                      '0 2px 8px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Box
                    sx={{
                      px:
                        2.5,

                      py:
                        2.25,
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
                          Assignment Queue
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.25,

                            color:
                              'text.secondary',

                            fontSize:
                              12,
                          }}
                        >
                          Active unassigned leads
                        </Typography>
                      </Box>


                      <Box
                        sx={{
                          minWidth:
                            34,

                          height:
                            30,

                          px:
                            1,

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',

                          bgcolor:
                            unassignedLeadCount >
                            0
                              ? '#fff8e6'
                              : '#f4f7fb',

                          color:
                            unassignedLeadCount >
                            0
                              ? '#b54708'
                              : '#475467',

                          borderRadius:
                            '8px',

                          fontSize:
                            13,

                          fontWeight:
                            700,
                        }}
                      >
                        {unassignedLeadCount}
                      </Box>
                    </Stack>
                  </Box>


                  <Divider />


                  {unassignedLeads.length ===
                  0 ? (
                    <Box
                      sx={{
                        px:
                          2.5,

                        py:
                          2.25,
                      }}
                    >
                      <Typography
                        sx={{
                          color:
                            '#667085',

                          fontSize:
                            12.5,
                        }}
                      >
                        All active leads are currently assigned.
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
                      {unassignedLeads.map(
                        (
                          lead,
                        ) => (
                          <Box
                            key={
                              lead.id
                            }
                            sx={{
                              px:
                                2.5,

                              py:
                                1.5,
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
                                  1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  minWidth:
                                    0,
                                }}
                              >
                                <Typography
                                  sx={{
                                    color:
                                      '#172033',

                                    fontSize:
                                      12.75,

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
                              </Box>


                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  navigate(
                                    `/leads/${lead.id}`,
                                  )
                                }
                                sx={{
                                  minHeight:
                                    32,

                                  px:
                                    1.15,

                                  fontSize:
                                    11.5,
                                }}
                              >
                                Assign
                              </Button>
                            </Stack>
                          </Box>
                        ),
                      )}
                    </Stack>
                  )}
                </Card>


                {/*
                  LEAD STATUS
                */}

                <Card
                  variant="outlined"
                  sx={{
                    borderColor:
                      '#e4e8ef',

                    borderRadius:
                      '12px',

                    boxShadow:
                      '0 2px 8px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Box
                    sx={{
                      px:
                        2.5,

                      py:
                        2.25,
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
                      Lead Status
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.25,

                        color:
                          'text.secondary',

                        fontSize:
                          12,
                      }}
                    >
                      Current active lead stages
                    </Typography>
                  </Box>


                  <Divider />


                  <Stack
                    divider={
                      <Divider
                        flexItem
                      />
                    }
                  >
                    {[
                      {
                        label:
                          'New',

                        value:
                          newLeadCount,
                      },

                      {
                        label:
                          'Contacted',

                        value:
                          contactedLeadCount,
                      },

                      {
                        label:
                          'Qualified',

                        value:
                          qualifiedLeadCount,
                      },

                      {
                        label:
                          'Proposal',

                        value:
                          proposalLeadCount,
                      },
                    ].map(
                      (
                        item,
                      ) => (
                        <Stack
                          key={
                            item.label
                          }
                          direction="row"
                          sx={{
                            px:
                              2.5,

                            py:
                              1.35,

                            justifyContent:
                              'space-between',

                            alignItems:
                              'center',
                          }}
                        >
                          <Typography
                            sx={{
                              color:
                                '#475467',

                              fontSize:
                                12.5,
                            }}
                          >
                            {item.label}
                          </Typography>

                          <Typography
                            sx={{
                              color:
                                '#172033',

                              fontSize:
                                12.5,

                              fontWeight:
                                700,
                            }}
                          >
                            {item.value}
                          </Typography>
                        </Stack>
                      ),
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Box>
          </>
        ) : (
          <>
            {/*
              SALES REP /
              OTHER ROLE VIEW
            */}

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  sm:
                    'repeat(2, 1fr)',

                  lg:
                    isSalesRepresentative
                      ? 'repeat(4, 1fr)'
                      : 'repeat(3, 1fr)',
                },

                gap:
                  2.5,
              }}
            >
              {salesRepresentativeSummaryCards.map(
                (
                  card,
                ) => (
                  <Card
                    key={
                      card.title
                    }
                    variant="outlined"
                    onClick={() => {
                      if (
                        isSalesRepresentative &&
                        card.focus
                      ) {
                        handleSalesRepKpiClick(
                          card.focus,
                        )
                      }
                    }}
                    sx={{
                      borderColor:
                        isSalesRepresentative &&
                        card.focus ===
                          dashboardFocus
                          ? '#84adff'
                          : '#e4e8ef',

                      borderRadius:
                        '12px',

                      boxShadow:
                        '0 2px 8px rgba(15, 23, 42, 0.035)',

                      cursor:
                        isSalesRepresentative &&
                        card.focus
                          ? 'pointer'
                          : 'default',

                      transition:
                        'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',

                      '&:hover':
                        isSalesRepresentative &&
                        card.focus
                          ? {
                              borderColor:
                                '#84adff',

                              boxShadow:
                                '0 6px 18px rgba(21, 87, 213, 0.10)',

                              transform:
                                'translateY(-1px)',
                            }
                          : undefined,
                    }}
                  >
                    <CardContent>
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
                            sx={{
                              color:
                                '#667085',

                              fontSize:
                                12.5,
                            }}
                          >
                            {card.title}
                          </Typography>

                          <Typography
                            sx={{
                              mt:
                                0.6,

                              color:
                                '#172033',

                              fontSize:
                                24,

                              fontWeight:
                                700,
                            }}
                          >
                            {card.value}
                          </Typography>

                          {isSalesRepresentative &&
                            card.focus && (
                            <Typography
                              sx={{
                                mt:
                                  0.55,

                                color:
                                  '#1557d5',

                                fontSize:
                                  10.5,

                                fontWeight:
                                  600,
                              }}
                            >
                              Click to view
                            </Typography>
                          )}
                        </Box>

                        {card.icon}
                      </Stack>
                    </CardContent>
                  </Card>
                ),
              )}
            </Box>


            {isSalesRepresentative && (
              <Box
                sx={{
                  mt:
                    2.5,

                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    lg:
                      'minmax(0, 1fr) minmax(0, 1fr)',
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
                      '0 2px 8px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Box
                    sx={{
                      px:
                        2.5,

                      py:
                        2.25,
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          '#172033',

                        fontSize:
                          16,

                        fontWeight:
                          700,
                      }}
                    >
                      My Workload
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.25,

                        color:
                          'text.secondary',

                        fontSize:
                          12.5,
                      }}
                    >
                      Your current active lead workload
                    </Typography>
                  </Box>


                  <Divider />


                  <Box
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

                        gap:
                          2,

                        mb:
                          1.25,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color:
                              '#667085',

                            fontSize:
                              12,
                          }}
                        >
                          Active leads
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.2,

                            color:
                              '#172033',

                            fontSize:
                              24,

                            fontWeight:
                              700,
                          }}
                        >
                          {activeLeadCount}
                        </Typography>
                      </Box>


                      <Chip
                        size="small"
                        label={
                          workloadLevel
                        }
                        color={
                          workloadLevel ===
                          'Busy'
                            ? 'warning'
                            : workloadLevel ===
                                'Moderate'
                              ? 'info'
                              : 'success'
                        }
                        variant="outlined"
                      />
                    </Stack>


                    <Box
                      sx={{
                        height:
                          8,

                        overflow:
                          'hidden',

                        borderRadius:
                          999,

                        bgcolor:
                          '#edf0f4',
                      }}
                    >
                      <Box
                        sx={{
                          width:
                            `${workloadProgress}%`,

                          height:
                            '100%',

                          borderRadius:
                            999,

                          bgcolor:
                            workloadLevel ===
                            'Busy'
                              ? '#f79009'
                              : workloadLevel ===
                                  'Moderate'
                                ? '#2e90fa'
                                : '#12b76a',

                          transition:
                            'width 220ms ease',
                        }}
                      />
                    </Box>


                    <Typography
                      sx={{
                        mt:
                          0.8,

                        color:
                          '#98a2b3',

                        fontSize:
                          11,
                      }}
                    >
                      Advisory indicator based on active assigned leads.
                    </Typography>


                    <Divider
                      sx={{
                        my:
                          2,
                      }}
                    />


                    <Stack
                      divider={
                        <Divider
                          flexItem
                        />
                      }
                    >
                      {[
                        {
                          label:
                            'New',

                          value:
                            newLeadCount,
                        },

                        {
                          label:
                            'Contacted',

                          value:
                            contactedLeadCount,
                        },

                        {
                          label:
                            'Qualified',

                          value:
                            qualifiedLeadCount,
                        },

                        {
                          label:
                            'Proposal',

                          value:
                            proposalLeadCount,
                        },
                      ].map(
                        (
                          item,
                        ) => (
                          <Stack
                            key={
                              item.label
                            }
                            direction="row"
                            sx={{
                              py:
                                1.15,

                              justifyContent:
                                'space-between',

                              alignItems:
                                'center',
                            }}
                          >
                            <Typography
                              sx={{
                                color:
                                  '#475467',

                                fontSize:
                                  12.5,
                              }}
                            >
                              {item.label}
                            </Typography>

                            <Typography
                              sx={{
                                color:
                                  '#172033',

                                fontSize:
                                  12.5,

                                fontWeight:
                                  700,
                              }}
                            >
                              {item.value}
                            </Typography>
                          </Stack>
                        ),
                      )}
                    </Stack>
                  </Box>
                </Card>


                <Card
                  id="incoming-work"
                  variant="outlined"
                  sx={{
                    borderColor:
                      '#e4e8ef',

                    borderRadius:
                      '12px',

                    boxShadow:
                      '0 2px 8px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Box
                    sx={{
                      px:
                        2.5,

                      py:
                        2.25,
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
                              16,

                            fontWeight:
                              700,
                          }}
                        >
                          Incoming Work
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.25,

                            color:
                              'text.secondary',

                            fontSize:
                              12.5,
                          }}
                        >
                          {dashboardFocus ===
                          'OVERDUE'
                            ? 'Showing overdue follow-ups'
                            : dashboardFocus ===
                                'DUE_SOON'
                              ? 'Showing follow-ups due within 48 hours'
                              : 'Upcoming and overdue follow-ups'}
                        </Typography>
                      </Box>


                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems:
                            'center',
                        }}
                      >
                        {(dashboardFocus ===
                          'OVERDUE' ||
                          dashboardFocus ===
                            'DUE_SOON') && (
                          <Button
                            size="small"
                            onClick={
                              clearDashboardFocus
                            }
                            sx={{
                              minWidth:
                                'auto',

                              px:
                                1,

                              fontSize:
                                11,
                            }}
                          >
                            Show All
                          </Button>
                        )}

                        <EventRounded
                          sx={{
                            color:
                              '#667085',
                          }}
                        />
                      </Stack>
                    </Stack>
                  </Box>


                  <Divider />


                  {incomingFollowUps.length ===
                  0 ? (
                    <Box
                      sx={{
                        px:
                          2.5,

                        py:
                          4,

                        textAlign:
                          'center',
                      }}
                    >
                      <Typography
                        sx={{
                          color:
                            '#667085',

                          fontSize:
                            13,
                        }}
                      >
                        {dashboardFocus ===
                        'OVERDUE'
                          ? 'No overdue follow-ups.'
                          : dashboardFocus ===
                              'DUE_SOON'
                            ? 'No follow-ups are due within the next 48 hours.'
                            : 'No pending follow-ups right now.'}
                      </Typography>

                      <Typography
                        sx={{
                          mt:
                            0.4,

                          color:
                            '#98a2b3',

                          fontSize:
                            11.5,
                        }}
                      >
                        {dashboardFocus ===
                        'DEFAULT'
                          ? 'New scheduled work will appear here.'
                          : 'Use Show All to return to all incoming work.'}
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
                      {incomingFollowUps.map(
                        (
                          followUp,
                        ) => {
                          const relatedLead =
                            leads.find(
                              (
                                leadItem,
                              ) =>
                                leadItem.id ===
                                followUp.lead,
                            )

                          return (
                            <Box
                              key={
                                followUp.id
                              }
                              onClick={() =>
                                navigate(
                                  relatedLead
                                    ? `/leads/${relatedLead.id}?tab=follow-ups`
                                    : `/follow-ups/${followUp.id}`,
                                )
                              }
                              sx={{
                                px:
                                  2.5,

                                py:
                                  1.5,

                                cursor:
                                  'pointer',

                                '&:hover':
                                  {
                                    bgcolor:
                                      '#fafcff',
                                  },
                              }}
                            >
                              <Stack
                                direction="row"
                                sx={{
                                  justifyContent:
                                    'space-between',

                                  alignItems:
                                    'flex-start',

                                  gap:
                                    2,
                                }}
                              >
                                <Box
                                  sx={{
                                    minWidth:
                                      0,

                                    flex:
                                      1,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      color:
                                        '#172033',

                                      fontSize:
                                        13,

                                      fontWeight:
                                        600,

                                      lineHeight:
                                        1.4,
                                    }}
                                  >
                                    {followUp.title}
                                  </Typography>

                                  <Typography
                                    sx={{
                                      mt:
                                        0.25,

                                      color:
                                        '#7a8699',

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
                                    {relatedLead
                                      ? `${relatedLead.contact_name} · ${relatedLead.company_name}`
                                      : `Lead #${followUp.lead}`}
                                  </Typography>

                                  <Typography
                                    sx={{
                                      mt:
                                        0.45,

                                      color:
                                        followUp.is_overdue
                                          ? '#b42318'
                                          : '#667085',

                                      fontSize:
                                        11.5,

                                      fontWeight:
                                        followUp.is_overdue
                                          ? 600
                                          : 500,
                                    }}
                                  >
                                    {followUp.is_overdue
                                      ? `Overdue · ${formatDateTime(followUp.due_date)}`
                                      : `Due ${formatDateTime(followUp.due_date)}`}
                                  </Typography>
                                </Box>


                                <Chip
                                  size="small"
                                  label={
                                    followUp.is_overdue
                                      ? 'Overdue'
                                      : 'Upcoming'
                                  }
                                  color={
                                    followUp.is_overdue
                                      ? 'error'
                                      : 'info'
                                  }
                                  variant="outlined"
                                />
                              </Stack>
                            </Box>
                          )
                        },
                      )}
                    </Stack>
                  )}
                </Card>
              </Box>
            )}


            <Card
              id="my-leads"
              variant="outlined"
              sx={{
                mt:
                  2.5,

                borderColor:
                  '#e4e8ef',

                borderRadius:
                  '12px',

                boxShadow:
                  '0 2px 10px rgba(15, 23, 42, 0.04)',
              }}
            >
              <Box
                sx={{
                  px:
                    2.75,

                  py:
                    2.25,
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
                          16,

                        fontWeight:
                          700,
                      }}
                    >
                      {isSalesRepresentative
                        ? dashboardFocus ===
                            'QUALIFIED'
                          ? 'My Qualified Leads'
                          : dashboardFocus ===
                              'ACTIVE_LEADS'
                            ? 'My Active Leads'
                            : 'My Recent Leads'
                        : 'Recent Leads'}
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.25,

                        color:
                          'text.secondary',

                        fontSize:
                          12.5,
                      }}
                    >
                      {isSalesRepresentative
                        ? dashboardFocus ===
                            'QUALIFIED'
                          ? 'Leads currently at the qualified stage'
                          : dashboardFocus ===
                              'ACTIVE_LEADS'
                            ? 'All active leads currently assigned to you'
                            : 'Recently assigned lead records'
                        : 'Recently created lead records'}
                    </Typography>
                  </Box>


                  <Stack
                    direction="row"
                    spacing={0.75}
                  >
                    {isSalesRepresentative &&
                      (dashboardFocus ===
                        'QUALIFIED' ||
                        dashboardFocus ===
                          'ACTIVE_LEADS') && (
                        <Button
                          size="small"
                          onClick={
                            clearDashboardFocus
                          }
                        >
                          Show Recent
                        </Button>
                      )}

                    <Button
                      size="small"
                      onClick={() =>
                        navigate(
                          '/leads',
                        )
                      }
                    >
                      View All
                    </Button>
                  </Stack>
                </Stack>
              </Box>


              <Divider />


              {focusedLeads.length ===
              0 ? (
                <Box
                  sx={{
                    py:
                      5,

                    textAlign:
                      'center',
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        'text.secondary',

                      fontSize:
                        13,
                    }}
                  >
                    {isSalesRepresentative
                      ? 'No leads are currently assigned to you.'
                      : 'No leads have been created yet.'}
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
                  {focusedLeads.map(
                    (
                      lead,
                    ) => (
                      <Box
                        key={
                          lead.id
                        }
                        onClick={() =>
                          navigate(
                            `/leads/${lead.id}`,
                          )
                        }
                        sx={{
                          px:
                            2.75,

                          py:
                            1.5,

                          cursor:
                            'pointer',

                          '&:hover':
                            {
                              bgcolor:
                                '#fafcff',
                            },
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
                          <Stack
                            direction="row"
                            spacing={1.4}
                            sx={{
                              alignItems:
                                'center',

                              minWidth:
                                0,
                            }}
                          >
                            <Avatar
                              sx={{
                                width:
                                  38,

                                height:
                                  38,

                                bgcolor:
                                  '#edf2ff',

                                color:
                                  '#1748bf',

                                fontSize:
                                  12.5,

                                fontWeight:
                                  700,
                              }}
                            >
                              {getLeadInitials(
                                lead.contact_name,
                              )}
                            </Avatar>


                            <Box>
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
                                {lead.contact_name}
                              </Typography>

                              <Typography
                                sx={{
                                  color:
                                    '#7a8699',

                                  fontSize:
                                    11.5,
                                }}
                              >
                                {lead.company_name}
                              </Typography>
                            </Box>
                          </Stack>


                          <Chip
                            size="small"
                            label={
                              lead.status_display ||
                              getStatusLabel(
                                lead.status,
                              )
                            }
                            color={
                              getStatusColor(
                                lead.status,
                              )
                            }
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                    ),
                  )}
                </Stack>
              )}
            </Card>
          </>
        )}
      </Box>
    </Box>
  )
}


export default DashboardPage