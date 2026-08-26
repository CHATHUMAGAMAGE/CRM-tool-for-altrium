import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
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
  ClickAwayListener,
  Divider,
  IconButton,
  ListItemButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Popper,
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
  ManageAccountsRounded,
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
  PROFILE_UPDATED_EVENT,
  type CurrentUser,
} from '../../services/auth'

import {
  getFollowUpReminders,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getLeads,
  getTechnicalAssessments,
  type FollowUp,
  type Lead,
  type TechnicalAssessment,
  type WorkflowNotification,
} from '../../services/crm'

import ProfileSettingsDialog from '../profile/ProfileSettingsDialog'

import {
  getFinancialAssessments,
  type FinancialAssessment,
} from '../../services/financialCrm'


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


type GlobalSearchResultType =
  | 'LEAD'
  | 'TECHNICAL_ASSESSMENT'
  | 'FINANCIAL_ASSESSMENT'


type GlobalSearchResult = {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle: string
  meta: string
  path: string
}


function searchTextMatches(
  query: string,
  ...values:
    Array<
      string |
      number |
      null |
      undefined
    >
) {
  return values.some(
    (
      value,
    ) =>
      String(
        value ?? '',
      )
        .toLowerCase()
        .includes(
          query,
        ),
  )
}


function getSearchResultTypeLabel(
  type:
    GlobalSearchResultType,
) {
  switch (
    type
  ) {
    case 'TECHNICAL_ASSESSMENT':
      return 'Technical'

    case 'FINANCIAL_ASSESSMENT':
      return 'Financial'

    case 'LEAD':
    default:
      return 'Lead'
  }
}


function getSearchResultTypeColor(
  type:
    GlobalSearchResultType,
):
  | 'primary'
  | 'secondary'
  | 'success' {
  switch (
    type
  ) {
    case 'TECHNICAL_ASSESSMENT':
      return 'secondary'

    case 'FINANCIAL_ASSESSMENT':
      return 'success'

    case 'LEAD':
    default:
      return 'primary'
  }
}


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
    searchResults,
    setSearchResults,
  ] =
    useState<
      GlobalSearchResult[]
    >(
      [],
    )


  const [
    isSearching,
    setIsSearching,
  ] =
    useState(
      false,
    )


  const [
    searchError,
    setSearchError,
  ] =
    useState(
      '',
    )


  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(
      false,
    )


  const [
    selectedSearchIndex,
    setSelectedSearchIndex,
  ] =
    useState(
      0,
    )


  const searchAnchorRef =
    useRef<
      HTMLDivElement | null
    >(
      null,
    )


  const searchInputRef =
    useRef<
      HTMLInputElement | null
    >(
      null,
    )


  const [
    userMenuAnchor,
    setUserMenuAnchor,
  ] =
    useState<HTMLElement | null>(
      null,
    )


  const [
    profileDialogOpen,
    setProfileDialogOpen,
  ] =
    useState(
      false,
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

  const [notifications, setNotifications] = useState<WorkflowNotification[]>([])
  const [notificationError, setNotificationError] = useState('')

  const loadNotifications = useCallback(async () => {
    try {
      setNotifications(await getNotifications())
      setNotificationError('')
    } catch (requestError) {
      setNotificationError(
        requestError instanceof Error ? requestError.message : 'Unable to load notifications.',
      )
    }
  }, [])


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
    void loadNotifications()
    const interval = window.setInterval(() => void loadNotifications(), 30_000)
    return () => window.clearInterval(interval)
  }, [loadNotifications])


  useEffect(() => {
    const handleProfileUpdated =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<CurrentUser>

        setCurrentUser(
          customEvent.detail,
        )
      }

    window.addEventListener(
      PROFILE_UPDATED_EVENT,
      handleProfileUpdated,
    )

    return () => {
      window.removeEventListener(
        PROFILE_UPDATED_EVENT,
        handleProfileUpdated,
      )
    }
  }, [])


  useEffect(() => {
    void loadReminders()
  }, [
    location.pathname,
    loadReminders,
  ])


  useEffect(
    () => {
      const handleGlobalShortcut =
        (
          event:
            globalThis.KeyboardEvent,
        ) => {
          if (
            (
              event.ctrlKey ||
              event.metaKey
            ) &&
            event.key
              .toLowerCase() ===
              'k'
          ) {
            event.preventDefault()

            searchInputRef
              .current
              ?.focus()

            if (
              searchValue
                .trim()
                .length >=
              2
            ) {
              setSearchOpen(
                true,
              )
            }
          }
        }

      window.addEventListener(
        'keydown',
        handleGlobalShortcut,
      )

      return () => {
        window.removeEventListener(
          'keydown',
          handleGlobalShortcut,
        )
      }
    },
    [
      searchValue,
    ],
  )


  useEffect(
    () => {
      const query =
        searchValue
          .trim()
          .toLowerCase()

      if (
        query.length <
        2
      ) {
        setSearchResults(
          [],
        )

        setSearchError(
          '',
        )

        setIsSearching(
          false,
        )

        setSearchOpen(
          false,
        )

        setSelectedSearchIndex(
          0,
        )

        return
      }

      if (
        !currentUser
      ) {
        return
      }

      let cancelled =
        false

      const timeoutId =
        window.setTimeout(
          () => {
            const runSearch =
              async () => {
                setIsSearching(
                  true,
                )

                setSearchError(
                  '',
                )

                setSearchOpen(
                  true,
                )

                setSelectedSearchIndex(
                  0,
                )


                const role =
                  currentUser.role

                const canSearchLeads =
                  [
                    'ADMIN',
                    'MARKETING',
                    'SALES_REP',
                    'SALES_MANAGER',
                    'PROJECT_MANAGER',
                    'DIRECTOR',
                  ].includes(
                    role,
                  )

                const canSearchTechnical =
                  role ===
                    'ADMIN' ||
                  role ===
                    'SALES_MANAGER' ||
                  role ===
                    'TECH_LEAD'

                const canSearchFinancial =
                  role ===
                    'ADMIN' ||
                  role ===
                    'SALES_MANAGER' ||
                  role ===
                    'FINANCIAL_OFFICER'


                const [
                  leadResult,
                  technicalResult,
                  financialResult,
                ] =
                  await Promise.allSettled([
                    canSearchLeads
                      ? getLeads()
                      : Promise.resolve(
                          [] as Lead[],
                        ),

                    canSearchTechnical
                      ? getTechnicalAssessments()
                      : Promise.resolve(
                          [] as TechnicalAssessment[],
                        ),

                    canSearchFinancial
                      ? getFinancialAssessments()
                      : Promise.resolve(
                          [] as FinancialAssessment[],
                        ),
                  ])


                if (
                  cancelled
                ) {
                  return
                }


                const results:
                GlobalSearchResult[] =
                  []

                let searchableSourceCount =
                  0

                let failedSourceCount =
                  0


                if (
                  canSearchLeads
                ) {
                  searchableSourceCount +=
                    1

                  if (
                    leadResult.status ===
                    'fulfilled'
                  ) {
                    leadResult.value
                      .filter(
                        (
                          lead,
                        ) =>
                          searchTextMatches(
                            query,
                            lead.id,
                            lead.contact_name,
                            lead.company_name,
                            lead.email,
                            lead.phone,
                            lead.source,
                            lead.status_display,
                            lead.assigned_to_name,
                          ),
                      )
                      .forEach(
                        (
                          lead,
                        ) => {
                          results.push({
                            id:
                              `lead-${lead.id}`,

                            type:
                              'LEAD',

                            title:
                              lead.contact_name,

                            subtitle:
                              [
                                lead.company_name,
                                lead.email,
                              ]
                                .filter(Boolean)
                                .join(' • '),

                            meta:
                              [
                                lead.status_display,
                                lead.assigned_to_name
                                  ? `Assigned to ${lead.assigned_to_name}`
                                  : 'Unassigned',
                              ].join(' • '),

                            path:
                              `/leads/${lead.id}`,
                          })
                        },
                      )
                  } else {
                    failedSourceCount +=
                      1
                  }
                }


                if (
                  canSearchTechnical
                ) {
                  searchableSourceCount +=
                    1

                  if (
                    technicalResult.status ===
                    'fulfilled'
                  ) {
                    technicalResult.value
                      .filter(
                        (
                          assessment,
                        ) =>
                          searchTextMatches(
                            query,
                            assessment.id,
                            assessment.lead,
                            assessment.lead_contact_name,
                            assessment.lead_company_name,
                            assessment.status_display,
                            assessment.assigned_to_name,
                            assessment.requirements,
                          ),
                      )
                      .forEach(
                        (
                          assessment,
                        ) => {
                          results.push({
                            id:
                              `technical-${assessment.id}`,

                            type:
                              'TECHNICAL_ASSESSMENT',

                            title:
                              `Technical Assessment #${assessment.id}`,

                            subtitle:
                              [
                                assessment.lead_contact_name,
                                assessment.lead_company_name,
                              ]
                                .filter(Boolean)
                                .join(' • '),

                            meta:
                              [
                                assessment.status_display,
                                assessment.assigned_to_name
                                  ? `Assigned to ${assessment.assigned_to_name}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' • '),

                            path:
                              `/technical-assessments/${assessment.id}`,
                          })
                        },
                      )
                  } else {
                    failedSourceCount +=
                      1
                  }
                }


                if (
                  canSearchFinancial
                ) {
                  searchableSourceCount +=
                    1

                  if (
                    financialResult.status ===
                    'fulfilled'
                  ) {
                    financialResult.value
                      .filter(
                        (
                          assessment,
                        ) =>
                          searchTextMatches(
                            query,
                            assessment.id,
                            assessment.lead,
                            assessment.lead_contact_name,
                            assessment.lead_company_name,
                            assessment.status_display,
                            assessment.assigned_to_name,
                            assessment.requirements,
                          ),
                      )
                      .forEach(
                        (
                          assessment,
                        ) => {
                          results.push({
                            id:
                              `financial-${assessment.id}`,

                            type:
                              'FINANCIAL_ASSESSMENT',

                            title:
                              `Financial Assessment #${assessment.id}`,

                            subtitle:
                              [
                                assessment.lead_contact_name,
                                assessment.lead_company_name,
                              ]
                                .filter(Boolean)
                                .join(' • '),

                            meta:
                              [
                                assessment.status_display,
                                assessment.assigned_to_name
                                  ? `Assigned to ${assessment.assigned_to_name}`
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' • '),

                            path:
                              `/financial-assessments/${assessment.id}`,
                          })
                        },
                      )
                  } else {
                    failedSourceCount +=
                      1
                  }
                }


                const sortedResults =
                  results
                    .sort(
                      (
                        first,
                        second,
                      ) =>
                        first.title.localeCompare(
                          second.title,
                        ),
                    )
                    .slice(
                      0,
                      8,
                    )


                setSearchResults(
                  sortedResults,
                )


                if (
                  searchableSourceCount >
                    0 &&
                  failedSourceCount ===
                    searchableSourceCount
                ) {
                  setSearchError(
                    'Search is temporarily unavailable.',
                  )
                } else {
                  setSearchError(
                    '',
                  )
                }


                setIsSearching(
                  false,
                )
              }


            void runSearch()
          },
          250,
        )


      return () => {
        cancelled =
          true

        window.clearTimeout(
          timeoutId,
        )
      }
    },
    [
      currentUser,
      searchValue,
    ],
  )


  useEffect(
    () => {
      setSearchOpen(
        false,
      )

      setSelectedSearchIndex(
        0,
      )
    },
    [
      location.pathname,
    ],
  )


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
      void loadNotifications()
    }

  const handleOpenWorkflowNotification = async (item: WorkflowNotification) => {
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id)
        setNotifications((current) => current.map((notification) =>
          notification.id === item.id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ))
      } catch {
        // Navigation remains available if marking read fails.
      }
    }
    handleCloseNotifications()
    navigate(item.target_url)
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      const readAt = new Date().toISOString()
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })))
    } catch (requestError) {
      setNotificationError(requestError instanceof Error ? requestError.message : 'Unable to mark notifications as read.')
    }
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


  const handleOpenSearchResult =
    (
      result:
        GlobalSearchResult,
    ) => {
      setSearchValue(
        '',
      )

      setSearchResults(
        [],
      )

      setSearchOpen(
        false,
      )

      setSelectedSearchIndex(
        0,
      )

      navigate(
        result.path,
      )
    }


  const handleSearchKeyDown =
    (
      event:
        KeyboardEvent<HTMLInputElement>,
    ) => {
      if (
        event.key ===
        'ArrowDown'
      ) {
        event.preventDefault()

        if (
          searchResults.length >
          0
        ) {
          setSearchOpen(
            true,
          )

          setSelectedSearchIndex(
            (
              current,
            ) =>
              (
                current +
                1
              ) %
              searchResults.length,
          )
        }

        return
      }


      if (
        event.key ===
        'ArrowUp'
      ) {
        event.preventDefault()

        if (
          searchResults.length >
          0
        ) {
          setSearchOpen(
            true,
          )

          setSelectedSearchIndex(
            (
              current,
            ) =>
              (
                current -
                1 +
                searchResults.length
              ) %
              searchResults.length,
          )
        }

        return
      }


      if (
        event.key ===
        'Enter'
      ) {
        const selected =
          searchResults[
            selectedSearchIndex
          ]

        if (
          selected
        ) {
          event.preventDefault()

          handleOpenSearchResult(
            selected,
          )
        }

        return
      }


      if (
        event.key ===
        'Escape'
      ) {
        event.preventDefault()

        setSearchOpen(
          false,
        )
      }
    }


  const globalSearchPlaceholder =
    currentUser?.role ===
      'TECH_LEAD'
      ? 'Search technical assessments...'
      : currentUser?.role ===
          'FINANCIAL_OFFICER'
        ? 'Search financial assessments...'
        : currentUser?.role ===
            'ADMIN' ||
          currentUser?.role ===
            'SALES_MANAGER'
          ? 'Search leads and assessments...'
          : currentUser?.role ===
              'SOFTWARE_ENGINEER'
            ? 'No searchable Sprint 1 records'
            : 'Search leads, contacts, companies...'


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
            'var(--eleven-border)',

          backgroundColor:
            'var(--eleven-topbar-bg)',

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
                'var(--eleven-border)',

              borderRadius:
                '8px',

              color:
                'var(--eleven-text)',

              '&:hover': {
                backgroundColor:
                  'var(--eleven-bg)',
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
                      'var(--eleven-text-muted)',
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
                            'var(--eleven-text)',

                          font:
                            'inherit',

                          fontSize:
                            14,

                          fontWeight:
                            600,

                          '&:hover':
                            {
                              color:
                                'var(--eleven-primary)',
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
                                'var(--eleven-text-muted)',
                            }}
                          />
                        )}

                      <Typography
                        sx={{
                          color:
                            isLast
                              ? 'var(--eleven-text-secondary)'
                              : 'var(--eleven-text)',

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

          {currentUser?.role !== 'ADMIN' && (
          <Box
            ref={
              searchAnchorRef
            }
            sx={{
              width: {
                sm:
                  300,

                lg:
                  390,
              },

              display: {
                xs:
                  'none',

                sm:
                  'block',
              },
            }}
          >
            <TextField
              fullWidth
              size="small"

              placeholder={
                globalSearchPlaceholder
              }

              value={
                searchValue
              }

              disabled={
                currentUser?.role ===
                'SOFTWARE_ENGINEER'
              }

              inputRef={
                searchInputRef
              }

              onFocus={() => {
                if (
                  searchValue
                    .trim()
                    .length >=
                  2
                ) {
                  setSearchOpen(
                    true,
                  )
                }
              }}

              onChange={(
                event,
              ) => {
                setSearchValue(
                  event.target.value,
                )

                setSelectedSearchIndex(
                  0,
                )
              }}

              onKeyDown={
                handleSearchKeyDown
              }

              sx={{
                '& .MuiOutlinedInput-root':
                  {
                    height:
                      44,

                    borderRadius:
                      '8px',

                    backgroundColor:
                      'var(--eleven-paper)',

                    '& fieldset':
                      {
                        borderColor:
                          'var(--eleven-border)',
                      },

                    '&:hover fieldset':
                      {
                        borderColor:
                          'var(--eleven-border-strong)',
                      },

                    '&.Mui-focused fieldset':
                      {
                        borderColor:
                          'var(--eleven-primary)',

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
                        {isSearching ? (
                          <CircularProgress
                            size={18}
                          />
                        ) : (
                          <SearchRounded
                            sx={{
                              color:
                                'var(--eleven-text-muted)',
                            }}
                          />
                        )}
                      </InputAdornment>
                    ),

                  endAdornment:
                    (
                      <InputAdornment position="end">
                        <Box
                          sx={{
                            px:
                              0.8,

                            py:
                              0.25,

                            borderRadius:
                              '5px',

                            backgroundColor:
                              'var(--eleven-surface-soft)',

                            color:
                              'var(--eleven-text-muted)',

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
          </Box>
          )}


          {/* Notifications */}

          {currentUser?.role !== 'ADMIN' && (
          <IconButton
            aria-label="Notifications"
            onClick={
              handleOpenNotifications
            }
            sx={{
              width: 44,
              height: 44,

              color:
                'var(--eleven-text-secondary)',
            }}
          >
            <Badge
              color="error"

              badgeContent={
                reminders.length + notifications.filter((item) => !item.read_at).length
              }

              max={99}

              invisible={
                reminders.length + notifications.filter((item) => !item.read_at).length === 0
              }
            >
              <NotificationsNoneRounded />
            </Badge>
          </IconButton>
          )}


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
                  'var(--eleven-bg)',
              },
            }}
          >
            <Avatar
              src={
                currentUser?.avatar_url ||
                undefined
              }
              alt={
                displayName
              }
              sx={{
                width: 44,
                height: 44,

                backgroundColor:
                  'var(--eleven-primary-soft)',

                color:
                  'var(--eleven-primary)',

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
                  'var(--eleven-text-muted)',

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


      {/* GLOBAL SEARCH RESULTS */}

      <Popper
        open={
          searchOpen &&
          Boolean(
            searchAnchorRef.current,
          )
        }
        anchorEl={
          searchAnchorRef.current
        }
        placement="bottom-start"
        sx={{
          zIndex:
            1500,
        }}
      >
        <ClickAwayListener
          onClickAway={() =>
            setSearchOpen(
              false,
            )
          }
        >
          <Paper
            elevation={0}
            sx={{
              mt:
                1,

              width:
                searchAnchorRef.current
                  ?.clientWidth ??
                390,

              maxWidth:
                'calc(100vw - 24px)',

              overflow:
                'hidden',

              border:
                '1px solid',

              borderColor:
                'var(--eleven-border)',

              borderRadius:
                '10px',

              boxShadow:
                'var(--eleven-shadow-lg)',
            }}
          >
            <Box
              sx={{
                px:
                  2,

                py:
                  1.25,

                borderBottom:
                  '1px solid var(--eleven-border)',
              }}
            >
              <Typography
                sx={{
                  color:
                    'var(--eleven-text)',

                  fontSize:
                    12.5,

                  fontWeight:
                    800,
                }}
              >
                Global Search
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.2,

                  color:
                    'var(--eleven-text-muted)',

                  fontSize:
                    10.5,
                }}
              >
                Results are limited to records your role can access.
              </Typography>
            </Box>


            {isSearching && (
              <Box
                sx={{
                  py:
                    4,

                  display:
                    'flex',

                  justifyContent:
                    'center',
                }}
              >
                <CircularProgress
                  size={26}
                />
              </Box>
            )}


            {!isSearching &&
              searchError && (
              <Box
                sx={{
                  px:
                    2,

                  py:
                    3,

                  textAlign:
                    'center',
                }}
              >
                <Typography
                  sx={{
                    color:
                      'error.main',

                    fontSize:
                      12,
                  }}
                >
                  {searchError}
                </Typography>
              </Box>
            )}


            {!isSearching &&
              !searchError &&
              searchResults.length ===
                0 && (
              <Box
                sx={{
                  px:
                    2,

                  py:
                    4,

                  textAlign:
                    'center',
                }}
              >
                <SearchRounded
                  sx={{
                    mb:
                      0.75,

                    color:
                      'var(--eleven-text-muted)',

                    fontSize:
                      30,
                  }}
                />

                <Typography
                  sx={{
                    color:
                      'var(--eleven-text-secondary)',

                    fontSize:
                      12.5,

                    fontWeight:
                      700,
                  }}
                >
                  No results found
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.35,

                    color:
                      'var(--eleven-text-muted)',

                    fontSize:
                      10.5,
                  }}
                >
                  Try a contact, company, email, status or assessment.
                </Typography>
              </Box>
            )}


            {!isSearching &&
              !searchError &&
              searchResults.length >
                0 && (
              <Box
                sx={{
                  maxHeight:
                    430,

                  overflowY:
                    'auto',

                  py:
                    0.5,
                }}
              >
                {searchResults.map(
                  (
                    result,
                    index,
                  ) => (
                    <ListItemButton
                      key={
                        result.id
                      }
                      selected={
                        index ===
                        selectedSearchIndex
                      }
                      onMouseEnter={() =>
                        setSelectedSearchIndex(
                          index,
                        )
                      }
                      onClick={() =>
                        handleOpenSearchResult(
                          result,
                        )
                      }
                      sx={{
                        px:
                          1.75,

                        py:
                          1.25,

                        alignItems:
                          'flex-start',

                        gap:
                          1.25,

                        '&.Mui-selected':
                          {
                            bgcolor:
                              'var(--eleven-primary-soft)',
                          },

                        '&.Mui-selected:hover':
                          {
                            bgcolor:
                              'var(--eleven-primary-soft)',
                          },
                      }}
                    >
                      <Chip
                        size="small"
                        label={
                          getSearchResultTypeLabel(
                            result.type,
                          )
                        }
                        color={
                          getSearchResultTypeColor(
                            result.type,
                          )
                        }
                        variant="outlined"
                        sx={{
                          mt:
                            0.15,

                          minWidth:
                            62,

                          fontSize:
                            9.5,

                          fontWeight:
                            800,
                        }}
                      />

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
                              'var(--eleven-text)',

                            fontSize:
                              12.5,

                            fontWeight:
                              700,

                            lineHeight:
                              1.4,
                          }}
                        >
                          {result.title}
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.25,

                            color:
                              'var(--eleven-text-secondary)',

                            fontSize:
                              10.75,

                            lineHeight:
                              1.45,

                            overflow:
                              'hidden',

                            textOverflow:
                              'ellipsis',

                            whiteSpace:
                              'nowrap',
                          }}
                        >
                          {result.subtitle ||
                            'No additional details'}
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.3,

                            color:
                              'var(--eleven-text-muted)',

                            fontSize:
                              9.75,

                            lineHeight:
                              1.4,
                          }}
                        >
                          {result.meta}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  ),
                )}
              </Box>
            )}


            <Box
              sx={{
                px:
                  1.75,

                py:
                  1,

                borderTop:
                  '1px solid var(--eleven-border)',

                bgcolor:
                  'var(--eleven-surface-soft)',
              }}
            >
              <Typography
                sx={{
                  color:
                    'var(--eleven-text-muted)',

                  fontSize:
                    9.75,
                }}
              >
                ↑ ↓ navigate • Enter open • Esc close
              </Typography>
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>


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
                'var(--eleven-border)',

              borderRadius:
                '10px',

              boxShadow:
                'var(--eleven-shadow-lg)',
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
                    'var(--eleven-text)',
                }}
              >
                Notifications
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color:
                    'text.secondary',
                }}
              >
                Tasks, submissions, reviews, and reminders
              </Typography>
            </Box>

            {notifications.some((item) => !item.read_at) && (
              <Chip
                size="small"
                label="Mark all read"
                variant="outlined"
                onClick={() => void handleMarkAllRead()}
                sx={{ cursor: 'pointer' }}
              />
            )}

            {reminders.length > 0 && (
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

        {notificationError && (
          <Typography color="error" variant="caption" sx={{ px: 2.25, py: 1.25 }}>
            {notificationError}
          </Typography>
        )}

        {notifications.map((item) => (
          <MenuItem
            key={`notification-${item.id}`}
            onClick={() => void handleOpenWorkflowNotification(item)}
            sx={{
              px: 2.25,
              py: 1.5,
              whiteSpace: 'normal',
              alignItems: 'flex-start',
              bgcolor: item.read_at ? 'transparent' : 'var(--eleven-primary-soft)',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: item.read_at ? 600 : 800 }}>
                {item.title}
              </Typography>
              {item.message && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                  {item.message}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: 'var(--eleven-primary)', display: 'block', mt: 0.5 }}>
                {new Date(item.created_at).toLocaleString()}
              </Typography>
            </Box>
          </MenuItem>
        ))}

        {notifications.length > 0 && <Divider />}


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
          notifications.length === 0 &&
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
                    'var(--eleven-text-muted)',

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
                            'var(--eleven-surface-soft)',
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
                              ? 'var(--eleven-error-soft)'
                              : reminderType ===
                                  'DUE_SOON'
                                ? 'var(--eleven-warning-soft)'
                                : 'var(--eleven-info-soft)',

                          color:
                            reminderType ===
                            'OVERDUE'
                              ? 'var(--eleven-error)'
                              : reminderType ===
                                  'DUE_SOON'
                                ? 'var(--eleven-warning)'
                                : 'var(--eleven-info)',
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
                              'var(--eleven-text)',

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
                              'var(--eleven-primary)',

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
                'var(--eleven-border)',

              borderRadius:
                '8px',

              boxShadow:
                'var(--eleven-shadow-lg)',
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
              src={
                currentUser?.avatar_url ||
                undefined
              }
              alt={
                displayName
              }
              sx={{
                width: 40,
                height: 40,

                backgroundColor:
                  'var(--eleven-primary-soft)',

                color:
                  'var(--eleven-primary)',

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
          onClick={() => {
            handleCloseUserMenu()
            setProfileDialogOpen(true)
          }}
          sx={{
            minHeight: 48,
            gap: 1.25,
            fontSize: 14,
          }}
        >
          <ManageAccountsRounded fontSize="small" />
          Profile & appearance
        </MenuItem>

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
              'var(--eleven-error)',

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


      <ProfileSettingsDialog
        open={profileDialogOpen}
        user={currentUser}
        onClose={() => setProfileDialogOpen(false)}
      />
    </>
  )
}


export default AppTopBar
