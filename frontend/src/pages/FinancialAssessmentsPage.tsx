import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  AssignmentOutlined,
  CheckCircleOutlineRounded,
  PendingActionsOutlined,
  PlayCircleOutlineRounded,
  RefreshRounded,
} from '@mui/icons-material'

import {
  useNavigate,
  useSearchParams,
} from 'react-router'

import {
  getCurrentUser,
} from '../services/auth'

import {
  getFinancialAssessments,
  type FinancialAssessment,
  type FinancialAssessmentStatus,
} from '../services/financialCrm'


type Props = {
  dashboardMode?: boolean
}


type StatusFilter =
  | 'ALL'
  | FinancialAssessmentStatus


function formatDate(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const parsed =
    new Date(value)

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value
  }

  return parsed.toLocaleString()
}


function getStatusColor(
  status:
    FinancialAssessmentStatus,
):
  | 'default'
  | 'warning'
  | 'info'
  | 'success' {
  switch (status) {
    case 'REQUESTED':
      return 'warning'

    case 'IN_PROGRESS':
      return 'info'

    case 'SUBMITTED':
      return 'success'

    case 'REVIEWED':
      return 'default'

    default:
      return 'default'
  }
}


function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius:
          '10px',

        borderColor:
          'var(--eleven-border)',

        boxShadow:
          'none',
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          alignItems:
            'center',

          gap:
            1.3,
        }}
      >
        <Box
          sx={{
            width:
              38,

            height:
              38,

            borderRadius:
              '8px',

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            backgroundColor:
              'var(--eleven-primary-soft)',

            color:
              'var(--eleven-primary)',
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize:
                12,

              color:
                'var(--eleven-text-secondary)',

              fontWeight:
                600,
            }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              mt:
                0.2,

              fontSize:
                22,

              lineHeight:
                1.1,

              fontWeight:
                700,

              color:
                'var(--eleven-text)',
            }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}


function FinancialAssessmentsPage({
  dashboardMode = false,
}: Props) {
  const navigate =
    useNavigate()

  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams()

  const [
    assessments,
    setAssessments,
  ] =
    useState<
      FinancialAssessment[]
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
    useState<
      string | null
    >(null)

  const [
    searchText,
    setSearchText,
  ] =
    useState('')


  const statusParameter =
    searchParams.get(
      'status',
    )


  const urlStatus:
  StatusFilter =
    statusParameter ===
      'REQUESTED' ||
    statusParameter ===
      'IN_PROGRESS' ||
    statusParameter ===
      'SUBMITTED' ||
    statusParameter ===
      'REVIEWED'
      ? statusParameter
      : 'ALL'


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      StatusFilter
    >(
      urlStatus,
    )


  useEffect(
    () => {
      setStatusFilter(
        urlStatus,
      )
    },
    [
      urlStatus,
    ],
  )


  const loadAssessments =
    useCallback(
      async () => {
        setIsLoading(
          true,
        )

        setError(
          null,
        )

        try {
          const user =
            await getCurrentUser()

          if (
            user.role !==
            'FINANCIAL_OFFICER'
          ) {
            navigate(
              '/dashboard',
              {
                replace:
                  true,
              },
            )

            return
          }

          const data =
            await getFinancialAssessments()

          setAssessments(
            data,
          )
        } catch (
          loadError
        ) {
          setError(
            loadError
              instanceof Error
              ? loadError.message
              : 'Unable to load financial assessments.',
          )
        } finally {
          setIsLoading(
            false,
          )
        }
      },
      [
        navigate,
      ],
    )


  useEffect(
    () => {
      void loadAssessments()
    },
    [
      loadAssessments,
    ],
  )


  const counts =
    useMemo(
      () => ({
        total:
          assessments.length,

        requested:
          assessments.filter(
            (
              assessment,
            ) =>
              assessment.status ===
              'REQUESTED',
          ).length,

        inProgress:
          assessments.filter(
            (
              assessment,
            ) =>
              assessment.status ===
              'IN_PROGRESS',
          ).length,

        submitted:
          assessments.filter(
            (
              assessment,
            ) =>
              assessment.status ===
              'SUBMITTED',
          ).length,

        reviewed:
          assessments.filter(
            (
              assessment,
            ) =>
              assessment.status ===
              'REVIEWED',
          ).length,
      }),
      [
        assessments,
      ],
    )


  const filteredAssessments =
    useMemo(
      () => {
        const search =
          searchText
            .trim()
            .toLowerCase()

        return assessments
          .filter(
            (
              assessment,
            ) => {
              if (
                statusFilter !==
                  'ALL' &&
                assessment.status !==
                  statusFilter
              ) {
                return false
              }

              if (!search) {
                return true
              }

              const searchableText = [
                assessment
                  .lead_company_name,

                assessment
                  .lead_contact_name,

                assessment
                  .requested_by_name,

                assessment
                  .requirements,

                assessment
                  .status_display,
              ]
                .join(
                  ' ',
                )
                .toLowerCase()

              return searchableText.includes(
                search,
              )
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.updated_at,
              ).getTime() -
              new Date(
                left.updated_at,
              ).getTime(),
          )
      },
      [
        assessments,
        searchText,
        statusFilter,
      ],
    )


  const visibleAssessments =
    dashboardMode
      ? filteredAssessments.slice(
          0,
          6,
        )
      : filteredAssessments


  const handleStatusChange =
    (
      value:
        StatusFilter,
    ) => {
      setStatusFilter(
        value,
      )

      if (
        value ===
        'ALL'
      ) {
        setSearchParams(
          {},
        )
      } else {
        setSearchParams({
          status:
            value,
        })
      }
    }


  return (
    <Box
      sx={{
        px: {
          xs:
            2,

          sm:
            3,

          lg:
            4,
        },

        py:
          3,
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          flexDirection: {
            xs:
              'column',

            sm:
              'row',
          },

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
            component="h1"
            sx={{
              color:
                'var(--eleven-text)',

              fontSize: {
                xs:
                  25,

                md:
                  28,
              },

              fontWeight:
                700,

              lineHeight:
                1.2,
            }}
          >
            {dashboardMode
              ? 'Financial Assessment Dashboard'
              : 'My Financial Assessments'}
          </Typography>

          <Typography
            sx={{
              mt:
                0.6,

              color:
                'var(--eleven-text-secondary)',

              fontSize:
                13.5,
            }}
          >
            {dashboardMode
              ? 'Review assigned financial assessments and continue your pending work.'
              : 'Review, complete and track the financial assessments assigned to you.'}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <RefreshRounded />
          }
          disabled={
            isLoading
          }
          onClick={() =>
            void loadAssessments()
          }
          sx={{
            minHeight:
              40,

            textTransform:
              'none',

            borderRadius:
              '8px',

            fontWeight:
              600,
          }}
        >
          Refresh
        </Button>
      </Box>


      {error && (
        <Alert
          severity="error"
          sx={{
            mt:
              2,
          }}
        >
          {error}
        </Alert>
      )}


      <Box
        sx={{
          mt:
            3,

          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            sm:
              'repeat(2, minmax(0, 1fr))',

            xl:
              'repeat(5, minmax(0, 1fr))',
          },

          gap:
            1.5,
        }}
      >
        <SummaryCard
          label="Assigned"
          value={
            counts.total
          }
          icon={
            <AssignmentOutlined />
          }
        />

        <SummaryCard
          label="Requested"
          value={
            counts.requested
          }
          icon={
            <PendingActionsOutlined />
          }
        />

        <SummaryCard
          label="In Progress"
          value={
            counts.inProgress
          }
          icon={
            <PlayCircleOutlineRounded />
          }
        />

        <SummaryCard
          label="Submitted"
          value={
            counts.submitted
          }
          icon={
            <CheckCircleOutlineRounded />
          }
        />

        <SummaryCard
          label="Reviewed"
          value={
            counts.reviewed
          }
          icon={
            <CheckCircleOutlineRounded />
          }
        />
      </Box>


      <Paper
        variant="outlined"
        sx={{
          mt:
            2.5,

          borderColor:
            'var(--eleven-border)',

          borderRadius:
            '10px',

          boxShadow:
            'none',

          overflow:
            'hidden',
        }}
      >
        <Box
          sx={{
            p:
              2,

            borderBottom:
              '1px solid var(--eleven-border)',
          }}
        >
          <Box
            sx={{
              display:
                'flex',

              flexDirection: {
                xs:
                  'column',

                md:
                  'row',
              },

              alignItems: {
                xs:
                  'stretch',

                md:
                  'center',
              },

              gap:
                1.5,
            }}
          >
            <Box
              sx={{
                flexGrow:
                  1,
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    16,

                  fontWeight:
                    700,

                  color:
                    'var(--eleven-text)',
                }}
              >
                {dashboardMode
                  ? 'Recent Assessments'
                  : 'Assessment Queue'}
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.2,

                  fontSize:
                    12.5,

                  color:
                    'var(--eleven-text-secondary)',
                }}
              >
                {
                  filteredAssessments.length
                } assessment
                {
                  filteredAssessments.length ===
                  1
                    ? ''
                    : 's'
                }
              </Typography>
            </Box>

            <TextField
              size="small"
              placeholder="Search company or contact..."
              value={
                searchText
              }
              onChange={(
                event,
              ) =>
                setSearchText(
                  event.target.value,
                )
              }
              sx={{
                width: {
                  xs:
                    '100%',

                  md:
                    260,
                },
              }}
            />

            <FormControl
              size="small"
              sx={{
                width: {
                  xs:
                    '100%',

                  md:
                    170,
                },
              }}
            >
              <InputLabel>
                Status
              </InputLabel>

              <Select
                label="Status"
                value={
                  statusFilter
                }
                onChange={(
                  event,
                ) =>
                  handleStatusChange(
                    event.target
                      .value as StatusFilter,
                  )
                }
              >
                <MenuItem
                  value="ALL"
                >
                  All
                </MenuItem>

                <MenuItem
                  value="REQUESTED"
                >
                  Requested
                </MenuItem>

                <MenuItem
                  value="IN_PROGRESS"
                >
                  In Progress
                </MenuItem>

                <MenuItem
                  value="SUBMITTED"
                >
                  Submitted
                </MenuItem>

                <MenuItem
                  value="REVIEWED"
                >
                  Reviewed
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>


        {isLoading ? (
          <Box
            sx={{
              minHeight:
                260,

              display:
                'flex',

              alignItems:
                'center',

              justifyContent:
                'center',
            }}
          >
            <CircularProgress
              size={
                30
              }
            />
          </Box>
        ) : visibleAssessments.length ===
          0 ? (
          <Box
            sx={{
              px:
                2,

              py:
                7,

              textAlign:
                'center',
            }}
          >
            <AssignmentOutlined
              sx={{
                fontSize:
                  44,

                color:
                  'var(--eleven-text-muted)',
              }}
            />

            <Typography
              sx={{
                mt:
                  1,

                fontSize:
                  15,

                fontWeight:
                  700,

                color:
                  'var(--eleven-text-secondary)',
              }}
            >
              No assessments found
            </Typography>

            <Typography
              sx={{
                mt:
                  0.4,

                fontSize:
                  13,

                color:
                  'var(--eleven-text-secondary)',
              }}
            >
              Assigned financial assessments will appear here.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor:
                      'var(--eleven-surface-soft)',
                  }}
                >
                  <TableCell>
                    Company
                  </TableCell>

                  <TableCell>
                    Contact
                  </TableCell>

                  <TableCell>
                    Requested By
                  </TableCell>

                  <TableCell>
                    Status
                  </TableCell>

                  <TableCell>
                    Updated
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleAssessments.map(
                  (
                    assessment,
                  ) => (
                    <TableRow
                      key={
                        assessment.id
                      }
                      hover
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize:
                              13.5,

                            fontWeight:
                              700,

                            color:
                              'var(--eleven-text)',
                          }}
                        >
                          {
                            assessment
                              .lead_company_name
                          }
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {
                          assessment
                            .lead_contact_name
                        }
                      </TableCell>

                      <TableCell>
                        {
                          assessment
                            .requested_by_name
                        }
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            assessment
                              .status_display
                          }
                          color={
                            getStatusColor(
                              assessment.status,
                            )
                          }
                          variant="outlined"
                          sx={{
                            fontWeight:
                              600,
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        {
                          formatDate(
                            assessment.updated_at,
                          )
                        }
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(
                              `/financial-assessments/${assessment.id}`,
                            )
                          }
                          sx={{
                            textTransform:
                              'none',

                            borderRadius:
                              '8px',

                            fontWeight:
                              600,
                          }}
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}


        {dashboardMode &&
          assessments.length >
            6 && (
            <Box
              sx={{
                p:
                  1.5,

                display:
                  'flex',

                justifyContent:
                  'flex-end',

                borderTop:
                  '1px solid var(--eleven-border)',
              }}
            >
              <Button
                onClick={() =>
                  navigate(
                    '/financial-assessments',
                  )
                }
                sx={{
                  textTransform:
                    'none',

                  fontWeight:
                    600,
                }}
              >
                View all assessments
              </Button>
            </Box>
          )}
      </Paper>
    </Box>
  )
}


export default FinancialAssessmentsPage