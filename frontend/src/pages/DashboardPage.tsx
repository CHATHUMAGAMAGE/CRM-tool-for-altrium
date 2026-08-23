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
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'

import {
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
      setIsLoading(true)
      setError('')

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


  const summaryCards = [
    {
      title:
        isSalesRepresentative
          ? 'My Total Leads'
          : 'Total Leads',

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
        isSalesRepresentative
          ? 'My Assigned Leads'
          : 'Assigned Leads',

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
        isSalesRepresentative
          ? 'My Qualified Leads'
          : 'Qualified Leads',

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
        p: {
          xs: 3,
          md: 5,
        },
      }}
    >
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
              fontWeight: 800,
            }}
          >
            Dashboard
          </Typography>

          <Typography
            sx={{
              color:
                'text.secondary',
            }}
          >
            {isSalesRepresentative
              ? 'Your ELEVEN CRM lead overview'
              : 'ELEVEN CRM operational overview'}
          </Typography>
        </Box>


        <Button
          startIcon={
            <RefreshRounded />
          }
          onClick={() =>
            void loadDashboard()
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
            mb: 3,
          }}
        >
          {error}
        </Alert>
      )}


      {isLoading ? (
        <Box
          sx={{
            minHeight:
              300,

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',
          }}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems:
                'center',
            }}
          >
            <CircularProgress />

            <Typography
              color="text.secondary"
            >
              Loading dashboard...
            </Typography>
          </Stack>
        </Box>
      ) : (
        <>
          {/* SUMMARY CARDS */}

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
                    'repeat(3, 1fr)',
                },

              gap:
                3,
            }}
          >
            {summaryCards.map(
              (
                card,
              ) => (
                <Card
                  key={
                    card.title
                  }
                  variant="outlined"
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
                          variant="body2"
                          sx={{
                            color:
                              'text.secondary',

                            textTransform:
                              'uppercase',
                          }}
                        >
                          {
                            card.title
                          }
                        </Typography>

                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight:
                              800,

                            mt:
                              1,
                          }}
                        >
                          {
                            card.value
                          }
                        </Typography>
                      </Box>

                      {
                        card.icon
                      }
                    </Stack>
                  </CardContent>
                </Card>
              ),
            )}
          </Box>


          {/* RECENT LEADS */}

          <Card
            variant="outlined"
            sx={{
              mt: 4,
            }}
          >
            <CardContent
              sx={{
                p: {
                  xs: 2.5,
                  md: 4,
                },
              }}
            >
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
                    recentLeads.length >
                    0
                      ? 3
                      : 0,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight:
                        700,
                    }}
                  >
                    {isSalesRepresentative
                      ? 'My Recent Leads'
                      : 'Recent Leads'}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt:
                        0.5,
                    }}
                  >
                    {isSalesRepresentative
                      ? 'Recently assigned lead records available to you.'
                      : 'Most recently created lead records in the CRM.'}
                  </Typography>
                </Box>


                <Button
                  variant="outlined"
                  onClick={() =>
                    navigate(
                      '/leads',
                    )
                  }
                >
                  View All Leads
                </Button>
              </Stack>


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
                      fontWeight:
                        700,
                    }}
                  >
                    No leads available
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt:
                        0.75,
                    }}
                  >
                    {isSalesRepresentative
                      ? 'No leads are currently assigned to you.'
                      : 'No leads have been created yet.'}
                  </Typography>
                </Box>
              ) : (
                <Stack
                  spacing={1.5}
                >
                  {recentLeads.map(
                    (
                      lead,
                    ) => (
                      <Card
                        key={
                          lead.id
                        }
                        variant="outlined"
                        onClick={() =>
                          navigate(
                            `/leads/${lead.id}`,
                          )
                        }
                        sx={{
                          p:
                            2,

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
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontWeight:
                                  800,
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

                            {!isSalesRepresentative && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Assigned to:{' '}
                                {lead.assigned_to_name ||
                                  'Unassigned'}
                              </Typography>
                            )}
                          </Box>


                          <Stack
                            direction="row"
                            spacing={2}
                            sx={{
                              alignItems:
                                'center',

                              flexWrap:
                                'wrap',
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                lead.status_display
                              }
                              color={
                                getStatusColor(
                                  lead.status,
                                )
                              }
                            />

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {formatDate(
                                lead.created_at,
                              )}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Card>
                    ),
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}


export default DashboardPage