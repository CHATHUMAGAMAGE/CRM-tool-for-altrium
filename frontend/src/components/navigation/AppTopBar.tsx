import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react'

import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'

import {
  AccessTimeRounded,
  ChevronRightRounded,
  DashboardOutlined,
  KeyboardArrowDownRounded,
  LogoutRounded,
  MenuRounded,
  NotificationsNoneRounded,
  SearchRounded,
} from '@mui/icons-material'

import {
  useLocation,
  useNavigate,
} from 'react-router'

import {
  getCurrentUser,
  logoutUser,
  type CurrentUser,
} from '../../services/auth'

import {
  getFollowUpReminders,
  type FollowUp,
} from '../../services/crm'


type AppTopBarProps = {
  onMenuClick?: () => void
}


type BreadcrumbItem = {
  label: string
  path?: string
}


type ReminderType =
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'UPCOMING'


function getReminderType(
  followUp: FollowUp,
): ReminderType {
  const now =
    new Date().getTime()

  const due =
    new Date(
      followUp.due_date,
    ).getTime()

  const difference =
    due - now

  if (
    followUp.is_overdue ||
    difference < 0
  ) {
    return 'OVERDUE'
  }

  const twoHours =
    2 * 60 * 60 * 1000

  if (
    difference <= twoHours
  ) {
    return 'DUE_SOON'
  }

  return 'UPCOMING'
}


function getReminderLabel(
  type: ReminderType,
) {
  switch (type) {
    case 'OVERDUE':
      return 'Overdue'

    case 'DUE_SOON':
      return 'Due Soon'

    case 'UPCOMING':
    default:
      return 'Upcoming'
  }
}


function getReminderChipColor(
  type: ReminderType,
):
  | 'error'
  | 'warning'
  | 'info' {
  switch (type) {
    case 'OVERDUE':
      return 'error'

    case 'DUE_SOON':
      return 'warning'

    case 'UPCOMING':
    default:
      return 'info'
  }
}


function formatReminderTime(
  followUp: FollowUp,
) {
  const now =
    new Date()

  const due =
    new Date(
      followUp.due_date,
    )

  const difference =
    due.getTime() -
    now.getTime()

  const absoluteMinutes =
    Math.max(
      1,
      Math.ceil(
        Math.abs(
          difference,
        ) /
          (60 * 1000),
      ),
    )

  if (
    difference < 0
  ) {
    if (
      absoluteMinutes < 60
    ) {
      return `${absoluteMinutes} min overdue`
    }

    const hours =
      Math.floor(
        absoluteMinutes /
          60,
      )

    const minutes =
      absoluteMinutes %
      60

    if (
      minutes === 0
    ) {
      return `${hours} hr overdue`
    }

    return `${hours} hr ${minutes} min overdue`
  }

  if (
    absoluteMinutes <= 120
  ) {
    if (
      absoluteMinutes < 60
    ) {
      return `Due in ${absoluteMinutes} min`
    }

    const hours =
      Math.floor(
        absoluteMinutes /
          60,
      )

    const minutes =
      absoluteMinutes %
      60

    if (
      minutes === 0
    ) {
      return `Due in ${hours} hr`
    }

    return `Due in ${hours} hr ${minutes} min`
  }

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )

  const dueDay =
    new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate(),
    )

  const differenceInDays =
    Math.round(
      (
        dueDay.getTime() -
        today.getTime()
      ) /
        (
          24 *
          60 *
          60 *
          1000
        ),
    )

  const time =
    due.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    )

  if (
    differenceInDays === 0
  ) {
    return `Today at ${time}`
  }

  if (
    differenceInDays === 1
  ) {
    return `Tomorrow at ${time}`
  }

  return due.toLocaleString(
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


function AppTopBar({
  onMenuClick,
}: AppTopBarProps) {
  const location =
    useLocation()

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
    searchValue,
    setSearchValue,
  ] =
    useState('')


  const [
    userMenuAnchor,
    setUserMenuAnchor,
  ] =
    useState<HTMLElement | null>(
      null,
    )


  const [
    notificationAnchor,
    setNotificationAnchor,
  ] =
    useState<HTMLElement | null>(
      null,
    )


  const [
    reminders,
    setReminders,
  ] =
    useState<FollowUp[]>(
      [],
    )


  const [
    isLoadingReminders,
    setIsLoadingReminders,
  ] =
    useState(false)


  const [
    reminderError,
    setReminderError,
  ] =
    useState('')


  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false)


  const loadReminders =
    useCallback(
      async () => {
        setIsLoadingReminders(
          true,
        )

        setReminderError(
          '',
        )

        try {
          const data =
            await getFollowUpReminders()

          setReminders(
            data,
          )
        } catch (
          requestError
        ) {
          setReminderError(
            requestError
              instanceof Error
              ? requestError.message
              : 'Unable to load follow-up reminders.',
          )
        } finally {
          setIsLoadingReminders(
            false,
          )
        }
      },
      [],
    )


  useEffect(() => {
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
  }, [])


  useEffect(() => {
    void loadReminders()
  }, [
    location.pathname,
    loadReminders,
  ])


  const displayName =
    useMemo(() => {
      if (
        !currentUser
      ) {
        return 'ELEVEN User'
      }

      const fullName = [
        currentUser.first_name,
        currentUser.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()

      return (
        fullName ||
        currentUser.username ||
        'ELEVEN User'
      )
    }, [
      currentUser,
    ])


  const initials =
    useMemo(() => {
      const parts =
        displayName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)

      return (
        parts
          .map(
            (part) =>
              part
                .charAt(0)
                .toUpperCase(),
          )
          .join('') ||
        'EU'
      )
    }, [
      displayName,
    ])


  const sortedReminders =
    useMemo(() => {
      return [
        ...reminders,
      ].sort(
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
      )
    }, [
      reminders,
    ])


  const breadcrumbs =
    useMemo<
      BreadcrumbItem[]
    >(() => {
      const pathname =
        location.pathname

      if (
        pathname ===
        '/dashboard'
      ) {
        return [
          {
            label:
              'Dashboard',
          },
          {
            label:
              'Overview',
          },
        ]
      }

      if (
        pathname ===
        '/leads'
      ) {
        return [
          {
            label:
              'Leads',
          },
          {
            label:
              'Leads List',
          },
        ]
      }

      if (
        pathname.startsWith(
          '/leads/',
        )
      ) {
        return [
          {
            label:
              'Leads',
            path:
              '/leads',
          },
          {
            label:
              'Lead Workspace',
          },
        ]
      }

      if (
        pathname.startsWith(
          '/follow-ups/',
        )
      ) {
        return [
          {
            label:
              'Leads',
            path:
              '/leads',
          },
          {
            label:
              'Follow-up',
          },
        ]
      }

      if (
        pathname ===
        '/customers'
      ) {
        return [
          {
            label:
              'Customers',
          },
          {
            label:
              'Customer List',
          },
        ]
      }

      if (
        pathname ===
        '/admin'
      ) {
        return [
          {
            label:
              'Administration',
          },
          {
            label:
              'User Management',
          },
        ]
      }

      return [
        {
          label:
            'ELEVEN CRM',
        },
      ]
    }, [
      location.pathname,
    ])


  const handleOpenUserMenu =
    (
      event:
        MouseEvent<HTMLElement>,
    ) => {
      setUserMenuAnchor(
        event.currentTarget,
      )
    }


  const handleCloseUserMenu =
    () => {
      setUserMenuAnchor(
        null,
      )
    }


  const handleOpenNotifications =
    (
      event:
        MouseEvent<HTMLElement>,
    ) => {
      setNotificationAnchor(
        event.currentTarget,
      )

      void loadReminders()
    }


  const handleCloseNotifications =
    () => {
      setNotificationAnchor(
        null,
      )
    }


  const handleOpenReminder =
    (
      followUp:
        FollowUp,
    ) => {
      handleCloseNotifications()

      navigate(
        `/follow-ups/${followUp.id}`,
      )
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

      handleCloseUserMenu()

      void logoutUser()

      navigate(
        '/login',
        {
          replace: true,
        },
      )
    }


  const isManagerView =
    currentUser?.role ===
      'ADMIN' ||
    currentUser?.role ===
      'SALES_MANAGER' ||
    currentUser?.role ===
      'PROJECT_MANAGER'


  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          zIndex: 1100,

          height: 80,

          justifyContent:
            'center',

          borderBottom:
            '1px solid',

          borderColor:
            '#e5e9f0',

          backgroundColor:
            'rgba(255,255,255,0.98)',

          backdropFilter:
            'blur(12px)',
        }}
      >
        <Toolbar
          sx={{
            minHeight:
              '80px !important',

            px: {
              xs: 2,
              sm: 3,
            },

            gap: {
              xs: 1,
              md: 2.5,
            },
          }}
        >
          {/* Sidebar toggle */}

          <IconButton
            onClick={
              onMenuClick
            }
            aria-label="Toggle navigation menu"
            sx={{
              width: 48,
              height: 48,

              flexShrink: 0,

              border:
                '1px solid',

              borderColor:
                '#dfe4ec',

              borderRadius:
                '8px',

              color:
                '#182338',

              '&:hover': {
                backgroundColor:
                  '#f7f9fc',
              },
            }}
          >
            <MenuRounded />
          </IconButton>


          {/* Breadcrumb */}

          <Box
            sx={{
              minWidth: 0,

              flexGrow: 1,

              display: {
                xs: 'none',
                sm: 'block',
              },
            }}
          >
            <Breadcrumbs
              separator={
                <ChevronRightRounded
                  sx={{
                    fontSize:
                      19,

                    color:
                      '#7b879b',
                  }}
                />
              }

              aria-label="breadcrumb"

              sx={{
                '& .MuiBreadcrumbs-ol':
                  {
                    flexWrap:
                      'nowrap',
                  },
              }}
            >
              {breadcrumbs.map(
                (
                  item,
                  index,
                ) => {
                  const isLast =
                    index ===
                    breadcrumbs.length -
                      1

                  if (
                    item.path &&
                    !isLast
                  ) {
                    return (
                      <Box
                        key={`${item.label}-${index}`}
                        component="button"
                        type="button"
                        onClick={() =>
                          navigate(
                            item.path as string,
                          )
                        }
                        sx={{
                          p: 0,
                          border: 0,

                          background:
                            'none',

                          cursor:
                            'pointer',

                          color:
                            '#172033',

                          font:
                            'inherit',

                          fontSize:
                            14,

                          fontWeight:
                            600,

                          '&:hover':
                            {
                              color:
                                '#0b5cff',
                            },
                        }}
                      >
                        {
                          item.label
                        }
                      </Box>
                    )
                  }

                  return (
                    <Stack
                      key={`${item.label}-${index}`}
                      direction="row"
                      spacing={
                        0.8
                      }
                      sx={{
                        alignItems:
                          'center',

                        minWidth:
                          0,
                      }}
                    >
                      {index ===
                        0 &&
                        location.pathname ===
                          '/dashboard' && (
                          <DashboardOutlined
                            sx={{
                              fontSize:
                                19,

                              color:
                                '#657087',
                            }}
                          />
                        )}

                      <Typography
                        sx={{
                          color:
                            isLast
                              ? '#536078'
                              : '#172033',

                          fontSize:
                            14,

                          fontWeight:
                            isLast
                              ? 500
                              : 600,

                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {
                          item.label
                        }
                      </Typography>
                    </Stack>
                  )
                },
              )}
            </Breadcrumbs>
          </Box>


          {/* Global search */}

          <TextField
            size="small"

            placeholder="Search leads, contacts, deals..."

            value={
              searchValue
            }

            onChange={(
              event,
            ) =>
              setSearchValue(
                event.target
                  .value,
              )
            }

            sx={{
              width: {
                sm: 300,
                lg: 390,
              },

              display: {
                xs: 'none',
                sm: 'block',
              },

              '& .MuiOutlinedInput-root':
                {
                  height:
                    44,

                  borderRadius:
                    '8px',

                  backgroundColor:
                    '#ffffff',

                  '& fieldset':
                    {
                      borderColor:
                        '#dfe4ec',
                    },

                  '&:hover fieldset':
                    {
                      borderColor:
                        '#cbd3df',
                    },

                  '&.Mui-focused fieldset':
                    {
                      borderColor:
                        '#0b5cff',

                      borderWidth:
                        1,
                    },
                },

              '& input':
                {
                  fontSize:
                    14,
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
                            '#68758c',
                        }}
                      />
                    </InputAdornment>
                  ),

                endAdornment:
                  (
                    <InputAdornment position="end">
                      <Box
                        sx={{
                          px: 0.8,
                          py: 0.25,

                          borderRadius:
                            '5px',

                          backgroundColor:
                            '#f2f4f7',

                          color:
                            '#7a8496',

                          fontSize:
                            11,

                          fontWeight:
                            700,

                          lineHeight:
                            1.5,
                        }}
                      >
                        ⌘ K
                      </Box>
                    </InputAdornment>
                  ),
              },
            }}
          />


          {/* Follow-up notifications */}

          <IconButton
            aria-label="Follow-up reminders"
            onClick={
              handleOpenNotifications
            }
            sx={{
              width: 44,
              height: 44,

              color:
                '#26344d',
            }}
          >
            <Badge
              color="error"

              badgeContent={
                reminders.length
              }

              max={99}

              invisible={
                reminders.length ===
                0
              }
            >
              <NotificationsNoneRounded />
            </Badge>
          </IconButton>


          {/* User menu */}

          <Stack
            direction="row"
            spacing={0.7}

            onClick={
              handleOpenUserMenu
            }

            sx={{
              alignItems:
                'center',

              cursor:
                'pointer',

              borderRadius:
                '8px',

              py: 0.5,
              pl: 0.5,
              pr: 0.75,

              '&:hover': {
                backgroundColor:
                  '#f7f9fc',
              },
            }}
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,

                backgroundColor:
                  '#edf2ff',

                color:
                  '#1748bf',

                fontSize:
                  14,

                fontWeight:
                  700,
              }}
            >
              {
                initials
              }
            </Avatar>

            <KeyboardArrowDownRounded
              sx={{
                color:
                  '#647188',

                fontSize:
                  21,

                display: {
                  xs:
                    'none',

                  sm:
                    'block',
                },
              }}
            />
          </Stack>
        </Toolbar>
      </AppBar>


      {/* FOLLOW-UP REMINDER MENU */}

      <Menu
        anchorEl={
          notificationAnchor
        }

        open={
          Boolean(
            notificationAnchor,
          )
        }

        onClose={
          handleCloseNotifications
        }

        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}

        transformOrigin={{
          vertical:
            'top',

          horizontal:
            'right',
        }}

        slotProps={{
          paper: {
            sx: {
              mt: 1,

              width:
                380,

              maxWidth:
                'calc(100vw - 24px)',

              maxHeight:
                520,

              border:
                '1px solid',

              borderColor:
                '#e1e5ec',

              borderRadius:
                '10px',

              boxShadow:
                '0 14px 36px rgba(15, 23, 42, 0.14)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2.25,
            py: 1.75,
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',

              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize:
                    15,

                  fontWeight:
                    800,

                  color:
                    '#172033',
                }}
              >
                Follow-up Reminders
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color:
                    'text.secondary',
                }}
              >
                {isManagerView
                  ? 'Team overdue follow-ups'
                  : 'Due within the next 24 hours'}
              </Typography>
            </Box>

            {reminders.length >
              0 && (
              <Chip
                size="small"

                label={
                  reminders.length
                }

                color="error"

                sx={{
                  fontWeight:
                    700,
                }}
              />
            )}
          </Stack>
        </Box>

        <Divider />


        {isLoadingReminders && (
          <Box
            sx={{
              py: 5,

              display:
                'flex',

              justifyContent:
                'center',
            }}
          >
            <CircularProgress
              size={28}
            />
          </Box>
        )}


        {!isLoadingReminders &&
          reminderError && (
            <Box
              sx={{
                px: 2.25,
                py: 3,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color:
                    'error.main',

                  textAlign:
                    'center',
                }}
              >
                {
                  reminderError
                }
              </Typography>
            </Box>
          )}


        {!isLoadingReminders &&
          !reminderError &&
          sortedReminders.length ===
            0 && (
            <Box
              sx={{
                px: 3,
                py: 5,

                textAlign:
                  'center',
              }}
            >
              <NotificationsNoneRounded
                sx={{
                  fontSize:
                    38,

                  color:
                    '#98a2b3',

                  mb: 1,
                }}
              />

              <Typography
                sx={{
                  fontSize:
                    14,

                  fontWeight:
                    700,
                }}
              >
                You're all caught up
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                }}
              >
                No follow-up
                reminders right now.
              </Typography>
            </Box>
          )}


        {!isLoadingReminders &&
          !reminderError &&
          sortedReminders.map(
            (
              followUp,
              index,
            ) => {
              const reminderType =
                getReminderType(
                  followUp,
                )

              return (
                <Box
                  key={
                    followUp.id
                  }
                >
                  <MenuItem
                    onClick={() =>
                      handleOpenReminder(
                        followUp,
                      )
                    }
                    sx={{
                      px:
                        2.25,

                      py:
                        1.75,

                      alignItems:
                        'flex-start',

                      whiteSpace:
                        'normal',

                      '&:hover':
                        {
                          backgroundColor:
                            '#f8fafc',
                        },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={
                        1.5
                      }
                      sx={{
                        width:
                          '100%',

                        alignItems:
                          'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          width:
                            38,

                          height:
                            38,

                          flexShrink:
                            0,

                          borderRadius:
                            '50%',

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',

                          backgroundColor:
                            reminderType ===
                            'OVERDUE'
                              ? '#fef3f2'
                              : reminderType ===
                                  'DUE_SOON'
                                ? '#fffaeb'
                                : '#eff8ff',

                          color:
                            reminderType ===
                            'OVERDUE'
                              ? '#d92d20'
                              : reminderType ===
                                  'DUE_SOON'
                                ? '#dc6803'
                                : '#1570ef',
                        }}
                      >
                        <AccessTimeRounded
                          sx={{
                            fontSize:
                              20,
                          }}
                        />
                      </Box>

                      <Box
                        sx={{
                          minWidth:
                            0,

                          flexGrow:
                            1,
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
                              1,

                            mb:
                              0.5,
                          }}
                        >
                          <Chip
                            size="small"

                            label={
                              getReminderLabel(
                                reminderType,
                              )
                            }

                            color={
                              getReminderChipColor(
                                reminderType,
                              )
                            }

                            sx={{
                              height:
                                22,

                              fontSize:
                                11,

                              fontWeight:
                                800,
                            }}
                          />

                          <Typography
                            variant="caption"
                            sx={{
                              color:
                                'text.secondary',

                              whiteSpace:
                                'nowrap',
                            }}
                          >
                            {formatReminderTime(
                              followUp,
                            )}
                          </Typography>
                        </Stack>

                        <Typography
                          sx={{
                            fontSize:
                              14,

                            fontWeight:
                              700,

                            color:
                              '#172033',

                            lineHeight:
                              1.4,
                          }}
                        >
                          {
                            followUp.title
                          }
                        </Typography>

                        {followUp.assigned_to_name && (
                          <Typography
                            variant="caption"
                            sx={{
                              mt:
                                0.4,

                              display:
                                'block',

                              color:
                                'text.secondary',
                            }}
                          >
                            Assigned to{' '}
                            {
                              followUp.assigned_to_name
                            }
                          </Typography>
                        )}

                        <Typography
                          variant="caption"
                          sx={{
                            display:
                              'block',

                            mt:
                              0.3,

                            color:
                              '#0b5cff',

                            fontWeight:
                              600,
                          }}
                        >
                          View follow-up
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>

                  {index <
                    sortedReminders.length -
                      1 && (
                    <Divider />
                  )}
                </Box>
              )
            },
          )}
      </Menu>


      {/* USER MENU */}

      <Menu
        anchorEl={
          userMenuAnchor
        }

        open={
          Boolean(
            userMenuAnchor,
          )
        }

        onClose={
          handleCloseUserMenu
        }

        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}

        transformOrigin={{
          vertical:
            'top',

          horizontal:
            'right',
        }}

        slotProps={{
          paper: {
            sx: {
              mt: 1,

              width:
                250,

              border:
                '1px solid',

              borderColor:
                '#e1e5ec',

              borderRadius:
                '8px',

              boxShadow:
                '0 12px 32px rgba(15, 23, 42, 0.12)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
          }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems:
                'center',
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,

                backgroundColor:
                  '#edf2ff',

                color:
                  '#1748bf',

                fontSize:
                  13,

                fontWeight:
                  700,
              }}
            >
              {
                initials
              }
            </Avatar>

            <Box
              sx={{
                minWidth:
                  0,
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    14,

                  fontWeight:
                    700,
                }}
              >
                {
                  displayName
                }
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color:
                    'text.secondary',
                }}
              >
                {currentUser?.role_display ??
                  'Loading...'}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider />

        <MenuItem
          onClick={
            handleLogout
          }

          disabled={
            isLoggingOut
          }

          sx={{
            minHeight:
              48,

            color:
              '#d92d20',

            gap:
              1.25,

            fontSize:
              14,
          }}
        >
          <LogoutRounded fontSize="small" />

          {isLoggingOut
            ? 'Logging out...'
            : 'Log out'}
        </MenuItem>
      </Menu>
    </>
  )
}


export default AppTopBar