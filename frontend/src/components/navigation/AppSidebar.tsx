import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  Avatar,
  Box,
  Button,
  Collapse,
  Divider,
  Stack,
  Typography,
} from '@mui/material'

import type {
  SxProps,
  Theme,
} from '@mui/material/styles'

import {
  AdminPanelSettingsOutlined,
  AssignmentOutlined,
  BarChartRounded,
  CalendarMonthOutlined,
  ChatBubbleOutlineRounded,
  DashboardOutlined,
  ExpandLessRounded,
  ExpandMoreRounded,
  GavelRounded,
  GroupsOutlined,
  HistoryRounded,
  KeyboardArrowDownRounded,
  LogoutRounded,
  PeopleOutlineRounded,
  PieChartOutlineRounded,
  StorageOutlined,
} from '@mui/icons-material'

import {
  useLocation,
  useNavigate,
} from 'react-router'

import BrandLogo from '../BrandLogo'

import {
  getCurrentUser,
  logoutUser,
  type CurrentUser,
} from '../../services/auth'

import {
  hasRequiredRole,
  type UserRole,
} from '../../auth/roles'


export const SIDEBAR_WIDTH = 296


type NavigationItem = {
  label: string
  path?: string
  icon: ReactNode
  allowedRoles?: UserRole[]
  available?: boolean
  visible?: boolean
}


const futureNavigationItems: NavigationItem[] = [
  {
    label:
      'Sales Pipeline',

    icon:
      <BarChartRounded />,

    available:
      false,

    visible:
      false,
  },
  {
    label:
      'Customers',

    path:
      '/customers',

    icon:
      <GroupsOutlined />,

    available:
      true,

    visible:
      false,
  },
  {
    label:
      'Reports & Analytics',

    icon:
      <PieChartOutlineRounded />,

    available:
      false,

    visible:
      false,
  },
  {
    label:
      'Communications',

    icon:
      <ChatBubbleOutlineRounded />,

    available:
      false,

    visible:
      false,
  },
  {
    label:
      'Integrations',

    icon:
      <StorageOutlined />,

    available:
      false,

    visible:
      false,
  },
]


type AppSidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}


function AppSidebar({
  mobile = false,
  onNavigate,
}: AppSidebarProps) {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<
      CurrentUser | null
    >(
      null,
    )

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(
      false,
    )


  const isTechLead =
    currentUser?.role ===
    'TECH_LEAD'


  const isFinancialOfficer =
    currentUser?.role ===
    'FINANCIAL_OFFICER'


  const isSpecialist =
    isTechLead ||
    isFinancialOfficer


  const specialistBasePath =
    isFinancialOfficer
      ? '/financial-assessments'
      : '/technical-assessments'


  const specialistLabel =
    isFinancialOfficer
      ? 'Financial Assessments'
      : 'Technical Assessments'


  const isLeadSectionPath =
    location.pathname ===
      '/leads' ||
    location.pathname.startsWith(
      '/leads/',
    ) ||
    location.pathname ===
      '/follow-ups' ||
    location.pathname.startsWith(
      '/follow-ups/',
    ) ||
    location.pathname ===
      '/activity'


  const isTechnicalAssessmentPath =
    location.pathname ===
      '/technical-assessments' ||
    location.pathname.startsWith(
      '/technical-assessments/',
    )


  const isFinancialAssessmentPath =
    location.pathname ===
      '/financial-assessments' ||
    location.pathname.startsWith(
      '/financial-assessments/',
    )


  const isAssessmentSectionPath =
    isTechLead
      ? isTechnicalAssessmentPath
      : isFinancialOfficer
        ? isFinancialAssessmentPath
        : false


  const [
    leadsExpanded,
    setLeadsExpanded,
  ] =
    useState(
      isLeadSectionPath,
    )


  const [
    assessmentsExpanded,
    setAssessmentsExpanded,
  ] =
    useState(
      isAssessmentSectionPath,
    )


  useEffect(
    () => {
      let isMounted =
        true

      const loadCurrentUser =
        async () => {
          try {
            const user =
              await getCurrentUser()

            if (
              isMounted
            ) {
              setCurrentUser(
                user,
              )
            }
          } catch {
            if (
              isMounted
            ) {
              setCurrentUser(
                null,
              )
            }
          }
        }

      void loadCurrentUser()

      return () => {
        isMounted =
          false
      }
    },
    [],
  )


  useEffect(
    () => {
      if (
        isLeadSectionPath
      ) {
        setLeadsExpanded(
          true,
        )
      }
    },
    [
      isLeadSectionPath,
    ],
  )


  useEffect(
    () => {
      if (
        isAssessmentSectionPath
      ) {
        setAssessmentsExpanded(
          true,
        )
      }
    },
    [
      isAssessmentSectionPath,
    ],
  )


  const handleNavigate =
    (
      path:
        string,
    ) => {
      navigate(
        path,
      )

      onNavigate?.()
    }


  const handleLogout =
    () => {
      if (
        isLoggingOut
      ) {
        return
      }

      setIsLoggingOut(
        true,
      )

      void logoutUser()

      onNavigate?.()

      navigate(
        '/login',
        {
          replace:
            true,
        },
      )
    }


  const displayName =
    currentUser
      ?.first_name
      ?.trim() ||
    currentUser
      ?.username ||
    'ELEVEN User'


  const initials =
    displayName
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (
          part,
        ) =>
          part
            .charAt(
              0,
            )
            .toUpperCase(),
      )
      .join(
        '',
      )


  const isSalesRepresentative =
    currentUser?.role ===
    'SALES_REP'


  const leadListLabel =
    isSalesRepresentative
      ? 'My Leads'
      : 'All Leads'


  const isDashboardActive =
    location.pathname ===
    '/dashboard'


  const isLeadListActive =
    location.pathname ===
    '/leads'


  const isFollowUpsActive =
    location.pathname ===
      '/follow-ups' ||
    location.pathname.startsWith(
      '/follow-ups/',
    )


  const isActivityActive =
    location.pathname ===
    '/activity'


  const isOpportunityReviewActive =
    location.pathname ===
      '/opportunity-review' ||
    location.pathname.startsWith(
      '/opportunity-review/',
    )


  const assessmentStatusParam =
    new URLSearchParams(
      location.search,
    ).get(
      'status',
    )


  const isAssessmentListActive =
    location.pathname ===
      specialistBasePath &&
    assessmentStatusParam !==
      'REVIEWED'


  const isAssessmentHistoryActive =
    location.pathname ===
      specialistBasePath &&
    assessmentStatusParam ===
      'REVIEWED'


  const canSeeOpportunityReview =
    currentUser !==
      null &&
    hasRequiredRole(
      currentUser.role,
      [
        'ADMIN',
        'SALES_MANAGER',
      ],
    )


  const canSeeAdministration =
    currentUser !==
      null &&
    hasRequiredRole(
      currentUser.role,
      [
        'ADMIN',
      ],
    )


  const navigationButtonSx =
    (
      active:
        boolean,
    ):
    SxProps<Theme> => ({
      position:
        'relative',

      minHeight:
        48,

      justifyContent:
        'flex-start',

      gap:
        0.8,

      px:
        2,

      borderRadius:
        '8px',

      textTransform:
        'none',

      fontSize:
        15,

      fontWeight:
        active
          ? 700
          : 500,

      color:
        active
          ? '#0b5cff'
          : '#26344d',

      backgroundColor:
        active
          ? '#eef4ff'
          : 'transparent',

      '& .MuiButton-startIcon':
        {
          marginRight:
            1,

          color:
            active
              ? '#0b5cff'
              : '#34445f',

          '& svg':
            {
              fontSize:
                22,
            },
        },

      '& .MuiButton-endIcon':
        {
          marginLeft:
            'auto',

          color:
            active
              ? '#0b5cff'
              : '#657087',

          '& svg':
            {
              fontSize:
                20,
            },
        },

      ...(active
        ? {
            '&::before':
              {
                content:
                  '""',

                position:
                  'absolute',

                left:
                  -8,

                top:
                  7,

                bottom:
                  7,

                width:
                  3,

                borderRadius:
                  '0 3px 3px 0',

                backgroundColor:
                  '#0b5cff',
              },
          }
        : {}),

      '&:hover':
        {
          backgroundColor:
            active
              ? '#e8f0ff'
              : '#f7f9fc',
        },
    })


  const childButtonSx =
    (
      active:
        boolean,
    ):
    SxProps<Theme> => ({
      minHeight:
        40,

      justifyContent:
        'flex-start',

      pl:
        5.6,

      pr:
        2,

      borderRadius:
        '8px',

      textTransform:
        'none',

      fontSize:
        14,

      fontWeight:
        active
          ? 700
          : 500,

      color:
        active
          ? '#0b5cff'
          : '#56647a',

      backgroundColor:
        active
          ? '#f3f7ff'
          : 'transparent',

      '& .MuiButton-startIcon':
        {
          minWidth:
            0,

          marginRight:
            1.1,

          color:
            active
              ? '#0b5cff'
              : '#68758c',

          '& svg':
            {
              fontSize:
                18,
            },
        },

      '&:hover':
        {
          backgroundColor:
            active
              ? '#edf3ff'
              : '#f7f9fc',
        },
    })


  return (
    <Box
      component="aside"
      sx={{
        width:
          SIDEBAR_WIDTH,

        height:
          mobile
            ? '100%'
            : '100vh',

        position:
          mobile
            ? 'relative'
            : 'sticky',

        top:
          0,

        alignSelf:
          'flex-start',

        display:
          mobile
            ? 'flex'
            : {
                xs:
                  'none',

                md:
                  'flex',
              },

        flexDirection:
          'column',

        flexShrink:
          0,

        boxSizing:
          'border-box',

        borderRight:
          '1px solid',

        borderColor:
          '#e5e9f0',

        backgroundColor:
          '#ffffff',

        px:
          2,

        py:
          2.5,

        overflowY:
          'auto',
      }}
    >
      <Box
        sx={{
          px:
            1,

          pb:
            3.5,
        }}
      >
        <BrandLogo
          variant="horizontal"
          sx={{
            width:
              190,

            maxHeight:
              54,

            objectFit:
              'contain',

            objectPosition:
              'left center',
          }}
        />

        <Typography
          variant="caption"
          sx={{
            display:
              'block',

            mt:
              0.7,

            ml:
              5.6,

            color:
              '#778198',

            letterSpacing:
              '0.13em',

            fontWeight:
              700,

            fontSize:
              11,
          }}
        >
          CRM FOR ALTRIUM
        </Typography>
      </Box>


      <Stack
        spacing={
          0.45
        }
      >
        <Button
          startIcon={
            <DashboardOutlined />
          }
          onClick={() =>
            handleNavigate(
              '/dashboard',
            )
          }
          sx={
            navigationButtonSx(
              isDashboardActive,
            )
          }
        >
          Dashboard
        </Button>


        {isSpecialist ? (
          <>
            <Button
              startIcon={
                <AssignmentOutlined />
              }
              endIcon={
                assessmentsExpanded
                  ? (
                    <ExpandLessRounded />
                  )
                  : (
                    <ExpandMoreRounded />
                  )
              }
              onClick={() =>
                setAssessmentsExpanded(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              sx={
                navigationButtonSx(
                  isAssessmentSectionPath,
                )
              }
            >
              {specialistLabel}
            </Button>

            <Collapse
              in={
                assessmentsExpanded
              }
              timeout="auto"
              unmountOnExit
            >
              <Stack
                spacing={
                  0.25
                }
                sx={{
                  mt:
                    0.25,

                  mb:
                    0.5,
                }}
              >
                <Button
                  startIcon={
                    <AssignmentOutlined />
                  }
                  onClick={() =>
                    handleNavigate(
                      specialistBasePath,
                    )
                  }
                  sx={
                    childButtonSx(
                      isAssessmentListActive,
                    )
                  }
                >
                  My Assessments
                </Button>

                <Button
                  startIcon={
                    <HistoryRounded />
                  }
                  onClick={() =>
                    handleNavigate(
                      `${specialistBasePath}?status=REVIEWED`,
                    )
                  }
                  sx={
                    childButtonSx(
                      isAssessmentHistoryActive,
                    )
                  }
                >
                  Assessment History
                </Button>
              </Stack>
            </Collapse>
          </>
        ) : (
          <>
            <Button
              startIcon={
                <PeopleOutlineRounded />
              }
              endIcon={
                leadsExpanded
                  ? (
                    <ExpandLessRounded />
                  )
                  : (
                    <ExpandMoreRounded />
                  )
              }
              onClick={() =>
                setLeadsExpanded(
                  (
                    current,
                  ) =>
                    !current,
                )
              }
              sx={
                navigationButtonSx(
                  isLeadSectionPath,
                )
              }
            >
              Leads
            </Button>


            <Collapse
              in={
                leadsExpanded
              }
              timeout="auto"
              unmountOnExit
            >
              <Stack
                spacing={
                  0.25
                }
                sx={{
                  mt:
                    0.25,

                  mb:
                    0.5,
                }}
              >
                <Button
                  startIcon={
                    <PeopleOutlineRounded />
                  }
                  onClick={() =>
                    handleNavigate(
                      '/leads',
                    )
                  }
                  sx={
                    childButtonSx(
                      isLeadListActive,
                    )
                  }
                >
                  {leadListLabel}
                </Button>


                <Button
                  startIcon={
                    <CalendarMonthOutlined />
                  }
                  onClick={() =>
                    handleNavigate(
                      '/follow-ups',
                    )
                  }
                  sx={
                    childButtonSx(
                      isFollowUpsActive,
                    )
                  }
                >
                  Follow-ups
                </Button>


                <Button
                  startIcon={
                    <ChatBubbleOutlineRounded />
                  }
                  onClick={() =>
                    handleNavigate(
                      '/activity',
                    )
                  }
                  sx={
                    childButtonSx(
                      isActivityActive,
                    )
                  }
                >
                  Activity
                </Button>
              </Stack>
            </Collapse>


            {canSeeOpportunityReview && (
              <Button
                startIcon={
                  <GavelRounded />
                }
                onClick={() =>
                  handleNavigate(
                    '/opportunity-review',
                  )
                }
                sx={
                  navigationButtonSx(
                    isOpportunityReviewActive,
                  )
                }
              >
                Opportunity Review
              </Button>
            )}


            {futureNavigationItems
              .filter(
                (
                  item,
                ) =>
                  item.visible !==
                  false,
              )
              .map(
                (
                  item,
                ) => (
                  <Button
                    key={
                      item.label
                    }
                    startIcon={
                      item.icon
                    }
                    disabled={
                      item.available ===
                      false
                    }
                    onClick={() => {
                      if (
                        item.path
                      ) {
                        handleNavigate(
                          item.path,
                        )
                      }
                    }}
                    sx={
                      navigationButtonSx(
                        false,
                      )
                    }
                  >
                    {item.label}
                  </Button>
                ),
              )}


            {canSeeAdministration && (
              <Button
                startIcon={
                  <AdminPanelSettingsOutlined />
                }
                onClick={() =>
                  handleNavigate(
                    '/admin',
                  )
                }
                sx={
                  navigationButtonSx(
                    location.pathname ===
                      '/admin' ||
                    location.pathname.startsWith(
                      '/admin/',
                    ),
                  )
                }
              >
                Administration
              </Button>
            )}
          </>
        )}
      </Stack>


      <Box
        sx={{
          flexGrow:
            1,
        }}
      />


      <Divider
        sx={{
          my:
            2.2,

          borderColor:
            '#e4e8ef',
        }}
      />


      <Stack
        spacing={
          0.4
        }
      >
        <Button
          startIcon={
            <LogoutRounded />
          }
          onClick={
            handleLogout
          }
          disabled={
            isLoggingOut
          }
          sx={{
            minHeight:
              46,

            justifyContent:
              'flex-start',

            px:
              2,

            borderRadius:
              '8px',

            color:
              '#26344d',

            textTransform:
              'none',

            fontSize:
              15,

            fontWeight:
              500,

            '& .MuiButton-startIcon svg':
              {
                fontSize:
                  22,
              },

            '&:hover':
              {
                backgroundColor:
                  '#f7f9fc',
              },
          }}
        >
          {isLoggingOut
            ? 'Logging out...'
            : 'Log out'}
        </Button>
      </Stack>


      <Box
        sx={{
          mt:
            2.2,

          p:
            1.5,

          minHeight:
            72,

          display:
            'flex',

          alignItems:
            'center',

          gap:
            1.25,

          flexShrink:
            0,

          border:
            '1px solid',

          borderColor:
            '#dfe4ec',

          borderRadius:
            '8px',

          backgroundColor:
            '#ffffff',
        }}
      >
        <Avatar
          sx={{
            width:
              42,

            height:
              42,

            flexShrink:
              0,

            backgroundColor:
              '#edf2ff',

            color:
              '#1548c7',

            fontWeight:
              700,

            fontSize:
              15,
          }}
        >
          {initials ||
            'EU'}
        </Avatar>


        <Box
          sx={{
            minWidth:
              0,

            flexGrow:
              1,
          }}
        >
          <Typography
            sx={{
              color:
                '#111827',

              fontSize:
                14,

              fontWeight:
                700,

              lineHeight:
                1.25,

              overflow:
                'hidden',

              textOverflow:
                'ellipsis',

              whiteSpace:
                'nowrap',
            }}
          >
            {displayName}
          </Typography>


          <Typography
            sx={{
              mt:
                0.25,

              color:
                '#68758c',

              fontSize:
                11.5,

              lineHeight:
                1.3,

              overflow:
                'hidden',

              textOverflow:
                'ellipsis',

              whiteSpace:
                'nowrap',
            }}
          >
            {currentUser?.role_display ??
              'Loading...'}
          </Typography>
        </Box>


        <KeyboardArrowDownRounded
          sx={{
            color:
              '#657087',

            fontSize:
              20,

            flexShrink:
              0,
          }}
        />
      </Box>
    </Box>
  )
}


export default AppSidebar