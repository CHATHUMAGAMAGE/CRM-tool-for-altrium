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
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import {
  AddRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material'

import {
  useNavigate,
} from 'react-router'

import {
  hasRequiredRole,
  type UserRole,
} from '../auth/roles'

import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'

import {
  createLead,
  getLeads,
  type Lead,
  type LeadStatus,
} from '../services/crm'


type LeadView =
  | 'ACTIVE'
  | 'CLOSED'
  | 'ALL'


const activeStatuses:
LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
]


const closedStatuses:
LeadStatus[] = [
  'WON',
  'LOST',
  'DISQUALIFIED',
]


const allStatuses:
LeadStatus[] = [
  ...activeStatuses,
  ...closedStatuses,
]


const leadCreatorRoles:
UserRole[] = [
  'ADMIN',
  'MARKETING',
  'SALES_MANAGER',
  'PROJECT_MANAGER',
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
  value:
    string | null,
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
  name:
    string,
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


function LeadsPage() {
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
    isCreating,
    setIsCreating,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('')


  const [
    search,
    setSearch,
  ] =
    useState('')


  const [
    leadView,
    setLeadView,
  ] =
    useState<LeadView>(
      'ACTIVE',
    )


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      LeadStatus | 'ALL'
    >(
      'ALL',
    )


  const [
    sourceFilter,
    setSourceFilter,
  ] =
    useState('ALL')


  const [
    assigneeFilter,
    setAssigneeFilter,
  ] =
    useState('ALL')


  const [
    addDialogOpen,
    setAddDialogOpen,
  ] =
    useState(false)


  const [
    form,
    setForm,
  ] =
    useState({
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      source: '',
      requirement: '',
    })


  const loadPageData =
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
            : 'Unable to load leads.',
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  useEffect(
    () => {
      let isMounted =
        true

      const loadInitialData =
        async () => {
          try {
            const [
              user,
              leadData,
            ] =
              await Promise.all([
                getCurrentUser(),
                getLeads(),
              ])

            if (
              !isMounted
            ) {
              return
            }

            setCurrentUser(
              user,
            )

            setLeads(
              leadData,
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
                : 'Unable to load leads.',
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

      void loadInitialData()

      return () => {
        isMounted =
          false
      }
    },
    [],
  )


  const isSalesRepresentative =
    currentUser?.role ===
    'SALES_REP'


  const isSalesManager =
    currentUser?.role ===
    'SALES_MANAGER'


  const canCreateLead =
    currentUser !== null &&
    hasRequiredRole(
      currentUser.role,
      leadCreatorRoles,
    )


  const activeLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            activeStatuses.includes(
              lead.status,
            ),
        ).length,
      [
        leads,
      ],
    )


  const closedLeadCount =
    useMemo(
      () =>
        leads.filter(
          (
            lead,
          ) =>
            closedStatuses.includes(
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
            activeStatuses.includes(
              lead.status,
            ),
        ).length,
      [
        leads,
      ],
    )


  const availableStatusOptions =
    useMemo(
      () => {
        if (
          leadView ===
          'ACTIVE'
        ) {
          return activeStatuses
        }

        if (
          leadView ===
          'CLOSED'
        ) {
          return closedStatuses
        }

        return allStatuses
      },
      [
        leadView,
      ],
    )


  const sourceOptions =
    useMemo(
      () => {
        const sources =
          new Set<string>()

        leads.forEach(
          (
            lead,
          ) => {
            const source =
              lead.source?.trim()

            if (
              source
            ) {
              sources.add(
                source,
              )
            }
          },
        )

        return Array.from(
          sources,
        ).sort(
          (
            first,
            second,
          ) =>
            first.localeCompare(
              second,
            ),
        )
      },
      [
        leads,
      ],
    )


  const assigneeOptions =
    useMemo(
      () => {
        const representatives =
          new Map<
            number,
            string
          >()

        leads.forEach(
          (
            lead,
          ) => {
            if (
              lead.assigned_to !==
                null &&
              lead.assigned_to_name
            ) {
              representatives.set(
                lead.assigned_to,
                lead.assigned_to_name,
              )
            }
          },
        )

        return Array.from(
          representatives.entries(),
        )
          .map(
            (
              [
                id,
                name,
              ],
            ) => ({
              id,
              name,
            }),
          )
          .sort(
            (
              first,
              second,
            ) =>
              first.name.localeCompare(
                second.name,
              ),
          )
      },
      [
        leads,
      ],
    )


  const filteredLeads =
    useMemo(
      () => {
        const query =
          search
            .toLowerCase()
            .trim()

        return leads.filter(
          (
            lead,
          ) => {
            const matchesSearch =
              !query ||
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
              lead.email
                .toLowerCase()
                .includes(
                  query,
                ) ||
              lead.phone
                .toLowerCase()
                .includes(
                  query,
                ) ||
              (
                lead.source || ''
              )
                .toLowerCase()
                .includes(
                  query,
                ) ||
              (
                lead.assigned_to_name ||
                ''
              )
                .toLowerCase()
                .includes(
                  query,
                )


            const matchesStatus =
              statusFilter ===
                'ALL' ||
              lead.status ===
                statusFilter


            const matchesLeadView =
              leadView ===
                'ALL' ||
              (
                leadView ===
                  'ACTIVE' &&
                activeStatuses.includes(
                  lead.status,
                )
              ) ||
              (
                leadView ===
                  'CLOSED' &&
                closedStatuses.includes(
                  lead.status,
                )
              )


            const matchesSource =
              sourceFilter ===
                'ALL' ||
              lead.source ===
                sourceFilter


            const matchesAssignee =
              isSalesRepresentative ||
              assigneeFilter ===
                'ALL' ||
              (
                assigneeFilter ===
                  'UNASSIGNED' &&
                lead.assigned_to ===
                  null
              ) ||
              (
                assigneeFilter !==
                  'UNASSIGNED' &&
                lead.assigned_to !==
                  null &&
                String(
                  lead.assigned_to,
                ) ===
                  assigneeFilter
              )


            return (
              matchesSearch &&
              matchesStatus &&
              matchesLeadView &&
              matchesSource &&
              matchesAssignee
            )
          },
        )
      },
      [
        leads,
        search,
        statusFilter,
        leadView,
        sourceFilter,
        assigneeFilter,
        isSalesRepresentative,
      ],
    )


  const hasActiveFilters =
    search.trim() !== '' ||
    leadView !==
      'ACTIVE' ||
    statusFilter !==
      'ALL' ||
    sourceFilter !==
      'ALL' ||
    (
      !isSalesRepresentative &&
      assigneeFilter !==
        'ALL'
    )


  const handleLeadViewChange =
    (
      view:
        LeadView,
    ) => {
      setLeadView(
        view,
      )

      setStatusFilter(
        'ALL',
      )
    }


  const handleClearFilters =
    () => {
      setSearch(
        '',
      )

      setLeadView(
        'ACTIVE',
      )

      setStatusFilter(
        'ALL',
      )

      setSourceFilter(
        'ALL',
      )

      setAssigneeFilter(
        'ALL',
      )
    }


  const resetCreateForm =
    () => {
      setForm({
        contactName: '',
        companyName: '',
        email: '',
        phone: '',
        source: '',
        requirement: '',
      })
    }


  const handleAddLead =
    async () => {
      if (
        !canCreateLead
      ) {
        return
      }

      if (
        !form.contactName.trim() ||
        !form.companyName.trim() ||
        !form.phone.trim() ||
        !form.requirement.trim()
      ) {
        return
      }

      setIsCreating(
        true,
      )

      setError(
        '',
      )

      setSuccessMessage(
        '',
      )

      try {
        const createdLead =
          await createLead({
            contact_name:
              form.contactName.trim(),

            company_name:
              form.companyName.trim(),

            email:
              form.email.trim(),

            phone:
              form.phone.trim(),

            source:
              form.source.trim(),

            requirement:
              form.requirement.trim(),
          })


        setLeads(
          (
            currentLeads,
          ) => [
            createdLead,
            ...currentLeads,
          ],
        )


        resetCreateForm()


        setLeadView(
          'ACTIVE',
        )

        setStatusFilter(
          'ALL',
        )

        setSourceFilter(
          'ALL',
        )

        setAssigneeFilter(
          'ALL',
        )


        setAddDialogOpen(
          false,
        )


        setSuccessMessage(
          `${createdLead.contact_name} was added successfully.`,
        )
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to create the lead.',
        )
      } finally {
        setIsCreating(
          false,
        )
      }
    }


  const getEmptyMessage =
    () => {
      if (
        isSalesRepresentative
      ) {
        if (
          leadView ===
          'ACTIVE'
        ) {
          return 'No active leads assigned to you'
        }

        if (
          leadView ===
          'CLOSED'
        ) {
          return 'No closed leads assigned to you'
        }

        return 'No leads assigned to you'
      }


      if (
        assigneeFilter ===
        'UNASSIGNED'
      ) {
        return 'No unassigned leads found'
      }


      if (
        leadView ===
        'ACTIVE'
      ) {
        return 'No active leads found'
      }


      if (
        leadView ===
        'CLOSED'
      ) {
        return 'No closed leads found'
      }


      return 'No leads found'
    }


  const pageTitle =
    isSalesRepresentative
      ? 'My Leads'
      : isSalesManager
        ? 'All Leads'
        : 'Leads'


  const pageDescription =
    isSalesRepresentative
      ? 'View and work with leads assigned to you.'
      : isSalesManager
        ? 'Manage and assign leads across the sales team.'
        : 'Manage and track Altrium leads.'


  const tableColumnCount =
    isSalesRepresentative
      ? 6
      : 7


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
              3,
          }}
        >
          <Box>
            <Typography
              sx={{
                color:
                  'var(--eleven-text)',

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
              {pageTitle}
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
              {pageDescription}
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
                void loadPageData()
              }
              disabled={
                isLoading
              }
              sx={{
                minHeight:
                  40,

                bgcolor:
                  'var(--eleven-paper)',
              }}
            >
              Refresh
            </Button>


            {canCreateLead && (
              <Button
                variant="contained"
                startIcon={
                  <AddRounded />
                }
                onClick={() => {
                  setError(
                    '',
                  )

                  setSuccessMessage(
                    '',
                  )

                  setAddDialogOpen(
                    true,
                  )
                }}
                sx={{
                  minHeight:
                    40,
                }}
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


        {successMessage && (
          <Alert
            severity="success"
            sx={{
              mb:
                2.5,
            }}
            onClose={() =>
              setSuccessMessage(
                '',
              )
            }
          >
            {successMessage}
          </Alert>
        )}


        {/*
          SUMMARY PANEL
        */}

        <Card
          variant="outlined"
          sx={{
            mb:
              2.5,

            borderColor:
              'var(--eleven-border)',

            borderRadius:
              '12px',

            boxShadow:
              'var(--eleven-shadow)',

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
                  isSalesRepresentative
                    ? 'repeat(3, 1fr)'
                    : 'repeat(4, 1fr)',
              },
            }}
          >
            {[
              {
                label:
                  isSalesRepresentative
                    ? 'My Active'
                    : 'Active',

                value:
                  activeLeadCount,
              },

              {
                label:
                  isSalesRepresentative
                    ? 'My Closed'
                    : 'Closed',

                value:
                  closedLeadCount,
              },

              ...(
                isSalesRepresentative
                  ? []
                  : [
                      {
                        label:
                          'Unassigned',

                        value:
                          unassignedLeadCount,
                      },
                    ]
              ),

              {
                label:
                  isSalesRepresentative
                    ? 'My Total'
                    : 'Total',

                value:
                  leads.length,
              },
            ].map(
              (
                item,
                index,
                items,
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
                      items.length -
                        1
                        ? {
                            md:
                              '1px solid var(--eleven-border)',
                          }
                        : undefined,

                    borderBottom: {
                      xs:
                        index <
                        Math.min(
                          2,
                          items.length,
                        )
                          ? '1px solid var(--eleven-border)'
                          : 'none',

                      md:
                        'none',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        'var(--eleven-text-secondary)',

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
                        0.45,

                      color:
                        'var(--eleven-text)',

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
          FILTER PANEL
        */}

        <Card
          variant="outlined"
          sx={{
            mb:
              2.5,

            borderColor:
              'var(--eleven-border)',

            borderRadius:
              '12px',

            boxShadow:
              'var(--eleven-shadow)',
          }}
        >
          <Box
            sx={{
              p: {
                xs:
                  2,

                md:
                  2.25,
              },
            }}
          >
            <Stack
              direction={{
                xs:
                  'column',

                lg:
                  'row',
              }}
              spacing={1.25}
              sx={{
                alignItems: {
                  lg:
                    'center',
                },
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search leads, companies or contacts..."
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
                sx={{
                  flex:
                    1,

                  minWidth: {
                    lg:
                      260,
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment:
                      (
                        <InputAdornment position="start">
                          <SearchRounded
                            sx={{
                              color:
                                'var(--eleven-text-secondary)',

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
                    145,
                }}
              >
                <InputLabel>
                  View
                </InputLabel>

                <Select
                  value={
                    leadView
                  }
                  label="View"
                  onChange={(
                    event,
                  ) =>
                    handleLeadViewChange(
                      event.target
                        .value as LeadView,
                    )
                  }
                >
                  <MenuItem value="ACTIVE">
                    Active ({activeLeadCount})
                  </MenuItem>

                  <MenuItem value="CLOSED">
                    Closed ({closedLeadCount})
                  </MenuItem>

                  <MenuItem value="ALL">
                    All ({leads.length})
                  </MenuItem>
                </Select>
              </FormControl>


              <FormControl
                size="small"
                sx={{
                  minWidth:
                    155,
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
                        .value as
                        | LeadStatus
                        | 'ALL',
                    )
                  }
                >
                  <MenuItem value="ALL">
                    All statuses
                  </MenuItem>

                  {availableStatusOptions.map(
                    (
                      status,
                    ) => (
                      <MenuItem
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {getStatusLabel(
                          status,
                        )}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>


              <FormControl
                size="small"
                sx={{
                  minWidth:
                    150,
                }}
              >
                <InputLabel>
                  Source
                </InputLabel>

                <Select
                  value={
                    sourceFilter
                  }
                  label="Source"
                  onChange={(
                    event,
                  ) =>
                    setSourceFilter(
                      event.target.value,
                    )
                  }
                >
                  <MenuItem value="ALL">
                    All sources
                  </MenuItem>

                  {sourceOptions.map(
                    (
                      source,
                    ) => (
                      <MenuItem
                        key={
                          source
                        }
                        value={
                          source
                        }
                      >
                        {source}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>


              {!isSalesRepresentative && (
                <FormControl
                  size="small"
                  sx={{
                    minWidth:
                      175,
                  }}
                >
                  <InputLabel>
                    Assigned To
                  </InputLabel>

                  <Select
                    value={
                      assigneeFilter
                    }
                    label="Assigned To"
                    onChange={(
                      event,
                    ) =>
                      setAssigneeFilter(
                        event.target.value,
                      )
                    }
                  >
                    <MenuItem value="ALL">
                      All representatives
                    </MenuItem>

                    <MenuItem value="UNASSIGNED">
                      Unassigned
                    </MenuItem>

                    {assigneeOptions.map(
                      (
                        representative,
                      ) => (
                        <MenuItem
                          key={
                            representative.id
                          }
                          value={
                            String(
                              representative.id,
                            )
                          }
                        >
                          {representative.name}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              )}


              {hasActiveFilters && (
                <Button
                  size="small"
                  variant="text"
                  onClick={
                    handleClearFilters
                  }
                  sx={{
                    minWidth:
                      'auto',

                    px:
                      1.25,

                    whiteSpace:
                      'nowrap',
                  }}
                >
                  Clear
                </Button>
              )}
            </Stack>
          </Box>
        </Card>


        {/*
          LEADS TABLE PANEL
        */}

        <Card
          variant="outlined"
          sx={{
            borderColor:
              'var(--eleven-border)',

            borderRadius:
              '12px',

            boxShadow:
              'var(--eleven-shadow)',

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
                      'var(--eleven-text)',

                    fontSize:
                      16,

                    fontWeight:
                      700,
                  }}
                >
                  {isSalesRepresentative
                    ? 'Assigned Leads'
                    : 'Lead List'}
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
                    ? 'Leads currently assigned to you'
                    : 'Sales team lead records'}
                </Typography>
              </Box>


              <Typography
                sx={{
                  color:
                    'text.secondary',

                  fontSize:
                    13,
                }}
              >
                {filteredLeads.length}{' '}
                {filteredLeads.length ===
                1
                  ? 'lead'
                  : 'leads'}
              </Typography>
            </Stack>
          </Box>


          <Divider />


          <TableContainer>
            <Table
              sx={{
                minWidth:
                  900,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      pl:
                        2.75,
                    }}
                  >
                    Lead
                  </TableCell>

                  <TableCell>
                    Company
                  </TableCell>

                  <TableCell>
                    Source
                  </TableCell>

                  {!isSalesRepresentative && (
                    <TableCell>
                      Assigned To
                    </TableCell>
                  )}

                  <TableCell>
                    Status
                  </TableCell>

                  <TableCell>
                    Created
                  </TableCell>

                  <TableCell
                    align="right"
                    sx={{
                      pr:
                        2.75,
                    }}
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>


              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={
                        tableColumnCount
                      }
                      align="center"
                      sx={{
                        py:
                          7,
                      }}
                    >
                      <CircularProgress
                        size={30}
                      />

                      <Typography
                        sx={{
                          mt:
                            1.5,

                          color:
                            'text.secondary',

                          fontSize:
                            13,
                        }}
                      >
                        Loading leads...
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}


                {!isLoading &&
                  filteredLeads.map(
                    (
                      lead,
                    ) => (
                      <TableRow
                        key={
                          lead.id
                        }
                        hover
                        onClick={() =>
                          navigate(
                            `/leads/${lead.id}`,
                          )
                        }
                        sx={{
                          cursor:
                            'pointer',

                          '&:last-child td':
                            {
                              borderBottom:
                                0,
                            },

                          '&:hover':
                            {
                              backgroundColor:
                                'var(--eleven-hover)',
                            },
                        }}
                      >
                        <TableCell
                          sx={{
                            pl:
                              2.75,

                            py:
                              1.6,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.4}
                            sx={{
                              alignItems:
                                'center',
                            }}
                          >
                            <Avatar
                              sx={{
                                width:
                                  38,

                                height:
                                  38,

                                bgcolor:
                                  'var(--eleven-primary-soft)',

                                color:
                                  'var(--eleven-primary)',

                                fontSize:
                                  13,

                                fontWeight:
                                  700,
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
                                    'var(--eleven-text)',

                                  fontSize:
                                    13.5,

                                  fontWeight:
                                    700,

                                  lineHeight:
                                    1.35,
                                }}
                              >
                                {lead.contact_name}
                              </Typography>

                              <Typography
                                sx={{
                                  mt:
                                    0.2,

                                  color:
                                    'var(--eleven-text-secondary)',

                                  fontSize:
                                    11.5,

                                  lineHeight:
                                    1.35,

                                  maxWidth:
                                    220,

                                  overflow:
                                    'hidden',

                                  textOverflow:
                                    'ellipsis',

                                  whiteSpace:
                                    'nowrap',
                                }}
                              >
                                {lead.email ||
                                  lead.phone ||
                                  'No contact details'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>


                        <TableCell>
                          <Typography
                            sx={{
                              color:
                                'var(--eleven-text)',

                              fontSize:
                                13,

                              fontWeight:
                                500,
                            }}
                          >
                            {lead.company_name}
                          </Typography>
                        </TableCell>


                        <TableCell>
                          <Typography
                            sx={{
                              color:
                                lead.source
                                  ? 'var(--eleven-text-secondary)'
                                  : 'var(--eleven-text-muted)',

                              fontSize:
                                13,
                            }}
                          >
                            {lead.source ||
                              '—'}
                          </Typography>
                        </TableCell>


                        {!isSalesRepresentative && (
                          <TableCell>
                            {lead.assigned_to_name ? (
                              <Typography
                                sx={{
                                  color:
                                    'var(--eleven-text-secondary)',

                                  fontSize:
                                    13,
                                }}
                              >
                                {
                                  lead.assigned_to_name
                                }
                              </Typography>
                            ) : (
                              <Chip
                                size="small"
                                label="Unassigned"
                                color="warning"
                                variant="outlined"
                                sx={{
                                  bgcolor:
                                    'color-mix(in srgb, var(--eleven-warning) 10%, var(--eleven-paper))',
                                }}
                              />
                            )}
                          </TableCell>
                        )}


                        <TableCell>
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
                                'var(--eleven-paper)',

                              fontSize:
                                11.5,
                            }}
                          />
                        </TableCell>


                        <TableCell>
                          <Typography
                            sx={{
                              color:
                                'var(--eleven-text-secondary)',

                              fontSize:
                                12.5,
                            }}
                          >
                            {formatDate(
                              lead.created_at,
                            )}
                          </Typography>
                        </TableCell>


                        <TableCell
                          align="right"
                          sx={{
                            pr:
                              2.75,
                          }}
                        >
                          <Button
                            size="small"
                            variant={
                              !isSalesRepresentative &&
                              lead.assigned_to ===
                                null
                                ? 'outlined'
                                : 'text'
                            }
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation()

                              navigate(
                                `/leads/${lead.id}`,
                              )
                            }}
                            sx={{
                              minHeight:
                                34,

                              minWidth:
                                58,

                              px:
                                1.3,

                              fontSize:
                                12.5,
                            }}
                          >
                            {!isSalesRepresentative &&
                            lead.assigned_to ===
                              null
                              ? 'Assign'
                              : 'Open'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )}


                {!isLoading &&
                  filteredLeads.length ===
                    0 && (
                    <TableRow>
                      <TableCell
                        colSpan={
                          tableColumnCount
                        }
                        align="center"
                        sx={{
                          py:
                            7,
                        }}
                      >
                        <Typography
                          sx={{
                            color:
                              'var(--eleven-text)',

                            fontSize:
                              14,

                            fontWeight:
                              600,
                          }}
                        >
                          {getEmptyMessage()}
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.5,

                            color:
                              'text.secondary',

                            fontSize:
                              12.5,
                          }}
                        >
                          Try changing your search or filters.
                        </Typography>

                        {hasActiveFilters && (
                          <Button
                            size="small"
                            onClick={
                              handleClearFilters
                            }
                            sx={{
                              mt:
                                1.25,
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>


        {/*
          CREATE LEAD DIALOG
        */}

        {canCreateLead && (
          <Dialog
            open={
              addDialogOpen
            }
            onClose={() => {
              if (
                !isCreating
              ) {
                setAddDialogOpen(
                  false,
                )
              }
            }}
            fullWidth
            maxWidth="sm"
            slotProps={{
              paper: {
                sx: {
                  borderRadius:
                    '12px',

                  border:
                    '1px solid var(--eleven-border)',

                  boxShadow:
                    '0 18px 48px rgba(15, 23, 42, 0.14)',
                },
              },
            }}
          >
            <DialogTitle
              sx={{
                px:
                  3,

                pt:
                  2.75,

                pb:
                  1,

                color:
                  'var(--eleven-text)',

                fontSize:
                  20,

                fontWeight:
                  700,
              }}
            >
              Create Lead
            </DialogTitle>


            <DialogContent
              sx={{
                px:
                  3,
              }}
            >
              <Typography
                sx={{
                  mb:
                    2.25,

                  color:
                    'text.secondary',

                  fontSize:
                    13,
                }}
              >
                Add a new prospect to the sales team.
              </Typography>


              <Stack
                spacing={2}
              >
                <TextField
                  required
                  label="Contact name"
                  value={
                    form.contactName
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      contactName:
                        event.target.value,
                    })
                  }
                />


                <TextField
                  required
                  label="Company"
                  value={
                    form.companyName
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      companyName:
                        event.target.value,
                    })
                  }
                />


                <TextField
                  label="Email address"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      email:
                        event.target.value,
                    })
                  }
                />


                <TextField
                  required
                  label="Phone number"
                  value={
                    form.phone
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      phone:
                        event.target.value,
                    })
                  }
                />


                <TextField
                  label="Lead source"
                  placeholder="Website, referral, campaign..."
                  value={
                    form.source
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      source:
                        event.target.value,
                    })
                  }
                />


                <TextField
                  required
                  multiline
                  minRows={3}
                  label="Requirement"
                  placeholder="Describe what the client needs..."
                  value={
                    form.requirement
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      requirement:
                        event.target.value,
                    })
                  }
                />


                <Alert
                  severity="info"
                  variant="outlined"
                  sx={{
                    fontSize:
                      12.5,
                  }}
                >
                  New leads are created unassigned. A Sales Manager can assign a Sales Representative from the lead workspace.
                </Alert>
              </Stack>
            </DialogContent>


            <DialogActions
              sx={{
                px:
                  3,

                pt:
                  2,

                pb:
                  2.75,
              }}
            >
              <Button
                onClick={() =>
                  setAddDialogOpen(
                    false,
                  )
                }
                disabled={
                  isCreating
                }
              >
                Cancel
              </Button>


              <Button
                variant="contained"
                onClick={() =>
                  void handleAddLead()
                }
                disabled={
                  isCreating ||
                  !form.contactName.trim() ||
                  !form.companyName.trim() ||
                  !form.phone.trim() ||
                  !form.requirement.trim()
                }
              >
                {isCreating ? (
                  <CircularProgress
                    size={22}
                    color="inherit"
                  />
                ) : (
                  'Create Lead'
                )}
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Box>
  )
}


export default LeadsPage
