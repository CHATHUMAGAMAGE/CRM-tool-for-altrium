import {
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

type AppTopBarProps = {
  onMenuClick?: () => void
}

type BreadcrumbItem = {
  label: string
  path?: string
}

function AppTopBar({
  onMenuClick,
}: AppTopBarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [searchValue, setSearchValue] =
    useState('')

  const [
    userMenuAnchor,
    setUserMenuAnchor,
  ] = useState<HTMLElement | null>(null)

  const [isLoggingOut, setIsLoggingOut] =
    useState(false)

  useEffect(() => {
    let isMounted = true

    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser()

        if (isMounted) {
          setCurrentUser(user)
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  const displayName = useMemo(() => {
    if (!currentUser) {
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
  }, [currentUser])

  const initials = useMemo(() => {
    const parts = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)

    return (
      parts
        .map((part) =>
          part.charAt(0).toUpperCase(),
        )
        .join('') || 'EU'
    )
  }, [displayName])

  const breadcrumbs =
    useMemo<BreadcrumbItem[]>(() => {
      const pathname = location.pathname

      if (pathname === '/dashboard') {
        return [
          {
            label: 'Dashboard',
          },
          {
            label: 'Overview',
          },
        ]
      }

      if (pathname === '/leads') {
        return [
          {
            label: 'Leads',
          },
          {
            label: 'Leads List',
          },
        ]
      }

      if (
        pathname.startsWith('/leads/')
      ) {
        return [
          {
            label: 'Leads',
            path: '/leads',
          },
          {
            label: 'Lead Workspace',
          },
        ]
      }

      if (
        pathname.startsWith('/follow-ups/')
      ) {
        return [
          {
            label: 'Leads',
            path: '/leads',
          },
          {
            label: 'Follow-up',
          },
        ]
      }

      if (pathname === '/customers') {
        return [
          {
            label: 'Customers',
          },
          {
            label: 'Customer List',
          },
        ]
      }

      if (pathname === '/admin') {
        return [
          {
            label: 'Administration',
          },
          {
            label: 'User Management',
          },
        ]
      }

      return [
        {
          label: 'ELEVEN CRM',
        },
      ]
    }, [location.pathname])

  const handleOpenUserMenu = (
    event: MouseEvent<HTMLElement>,
  ) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null)
  }

  const handleLogout = () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    handleCloseUserMenu()

    void logoutUser()

    navigate('/login', {
      replace: true,
    })
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
          justifyContent: 'center',
          borderBottom: '1px solid',
          borderColor: '#e5e9f0',
          backgroundColor:
            'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar
          sx={{
            minHeight: '80px !important',
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
            onClick={onMenuClick}
            aria-label="Toggle navigation menu"
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              border: '1px solid',
              borderColor: '#dfe4ec',
              borderRadius: '8px',
              color: '#182338',

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
                    fontSize: 19,
                    color: '#7b879b',
                  }}
                />
              }
              aria-label="breadcrumb"
              sx={{
                '& .MuiBreadcrumbs-ol': {
                  flexWrap: 'nowrap',
                },
              }}
            >
              {breadcrumbs.map(
                (item, index) => {
                  const isLast =
                    index ===
                    breadcrumbs.length - 1

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
                          background: 'none',
                          cursor: 'pointer',
                          color: '#172033',
                          font: 'inherit',
                          fontSize: 14,
                          fontWeight: 600,

                          '&:hover': {
                            color: '#0b5cff',
                          },
                        }}
                      >
                        {item.label}
                      </Box>
                    )
                  }

                  return (
                    <Stack
                      key={`${item.label}-${index}`}
                      direction="row"
                      spacing={0.8}
                      sx={{
                        alignItems: 'center',
                        minWidth: 0,
                      }}
                    >
                      {index === 0 &&
                        location.pathname ===
                          '/dashboard' && (
                          <DashboardOutlined
                            sx={{
                              fontSize: 19,
                              color:
                                '#657087',
                            }}
                          />
                        )}

                      <Typography
                        sx={{
                          color: isLast
                            ? '#536078'
                            : '#172033',
                          fontSize: 14,
                          fontWeight: isLast
                            ? 500
                            : 600,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {item.label}
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
            value={searchValue}
            onChange={(event) =>
              setSearchValue(
                event.target.value,
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

              '& .MuiOutlinedInput-root': {
                height: 44,
                borderRadius: '8px',
                backgroundColor: '#ffffff',

                '& fieldset': {
                  borderColor:
                    '#dfe4ec',
                },

                '&:hover fieldset': {
                  borderColor:
                    '#cbd3df',
                },

                '&.Mui-focused fieldset':
                  {
                    borderColor:
                      '#0b5cff',
                    borderWidth: 1,
                  },
              },

              '& input': {
                fontSize: 14,
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded
                      sx={{
                        color:
                          '#68758c',
                      }}
                    />
                  </InputAdornment>
                ),

                endAdornment: (
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
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.5,
                      }}
                    >
                      ⌘ K
                    </Box>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Notifications */}
          <IconButton
            aria-label="Notifications"
            sx={{
              width: 44,
              height: 44,
              color: '#26344d',
            }}
          >
            <Badge
              color="error"
              variant="dot"
              invisible
            >
              <NotificationsNoneRounded />
            </Badge>
          </IconButton>

          {/* User menu */}
          <Stack
            direction="row"
            spacing={0.7}
            onClick={handleOpenUserMenu}
            sx={{
              alignItems: 'center',
              cursor: 'pointer',
              borderRadius: '8px',
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
                color: '#1748bf',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>

            <KeyboardArrowDownRounded
              sx={{
                color: '#647188',
                fontSize: 21,
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            />
          </Stack>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleCloseUserMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 250,
              border: '1px solid',
              borderColor: '#e1e5ec',
              borderRadius: '8px',
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
              alignItems: 'center',
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor:
                  '#edf2ff',
                color: '#1748bf',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>

            <Box
              sx={{
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {displayName}
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
          onClick={handleLogout}
          disabled={isLoggingOut}
          sx={{
            minHeight: 48,
            color: '#d92d20',
            gap: 1.25,
            fontSize: 14,
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