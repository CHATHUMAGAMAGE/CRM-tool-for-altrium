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
  AddRounded,
  CheckCircleOutlineRounded,
  GroupOutlined,
  PersonAddOutlined,
  RefreshRounded,
} from '@mui/icons-material'

import {
  useNavigate,
} from 'react-router'

import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'

import {
  getLeads,
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
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    error,
    setError,
  ] =
    useState('')


  const loadDashboard =
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
          leadData,
        ] =
          await Promise.all([
            getCurrentUser(),
            getLeads(),
          ])

        setCurrentUser(
          user,
        )

        setLeads(
          leadData,
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


  const salesRepresentativeSummaryCards = [
    {
      title:
        'My Total Leads',

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
        'My Assigned Leads',

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
        'My Qualified Leads',

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


            {isSalesManager && (
              <Button
                variant="contained"
                startIcon={
                  <AddRounded />
                }
                onClick={() =>
                  navigate(
                    '/leads',
                  )
                }
              >
                Create Lead
              </Button>
            )}
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
                  },

                  {
                    label:
                      'Active',

                    value:
                      activeLeadCount,
                  },

                  {
                    label:
                      'Unassigned',

                    value:
                      unassignedLeadCount,
                  },

                  {
                    label:
                      'Qualified',

                    value:
                      qualifiedLeadCount,
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
                    'repeat(3, 1fr)',
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
                    sx={{
                      borderColor:
                        '#e4e8ef',

                      borderRadius:
                        '12px',

                      boxShadow:
                        '0 2px 8px rgba(15, 23, 42, 0.035)',
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
                        </Box>

                        {card.icon}
                      </Stack>
                    </CardContent>
                  </Card>
                ),
              )}
            </Box>


            <Card
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
                        ? 'My Recent Leads'
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
                        ? 'Recently assigned lead records'
                        : 'Recently created lead records'}
                    </Typography>
                  </Box>


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
              </Box>


              <Divider />


              {recentLeads.length ===
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