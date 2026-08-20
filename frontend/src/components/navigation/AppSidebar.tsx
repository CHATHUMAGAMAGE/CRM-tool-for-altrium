import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
  Avatar,
} from '@mui/material'
import {
  AdminPanelSettingsOutlined,
  BarChartRounded,
  CalendarMonthOutlined,
  ChatBubbleOutlineRounded,
  DashboardOutlined,
  GroupsOutlined,
  KeyboardArrowDownRounded,
  LogoutRounded,
  PeopleOutlineRounded,
  PieChartOutlineRounded,
  SettingsOutlined,
  StorageOutlined,
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router'

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
  icon: React.ReactNode
  allowedRoles?: UserRole[]
  available?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardOutlined />,
    available: true,
  },
  {
    label: 'Leads',
    path: '/leads',
    icon: <PeopleOutlineRounded />,
    available: true,
  },
  {
    label: 'Sales Pipeline',
    icon: <BarChartRounded />,
    available: false,
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: <GroupsOutlined />,
    available: true,
  },
  {
    label: 'Activities',
    icon: <CalendarMonthOutlined />,
    available: false,
  },
  {
    label: 'Reports & Analytics',
    icon: <PieChartOutlineRounded />,
    available: false,
  },
  {
    label: 'Communications',
    icon: <ChatBubbleOutlineRounded />,
    available: false,
  },
  {
    label: 'Integrations',
    icon: <StorageOutlined />,
    available: false,
  },
  {
    label: 'Administration',
    path: '/admin',
    icon: <AdminPanelSettingsOutlined />,
    allowedRoles: ['ADMIN'],
    available: true,
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
  const navigate = useNavigate()
  const location = useLocation()

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

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

  const handleNavigation = (
    item: NavigationItem,
  ) => {
    if (!item.path || item.available === false) {
      return
    }

    navigate(item.path)
    onNavigate?.()
  }

  const handleLogout = () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    void logoutUser()

    onNavigate?.()

    navigate('/login', {
      replace: true,
    })
  }

  const visibleNavigationItems =
    navigationItems.filter((item) => {
      if (!item.allowedRoles) {
        return true
      }

      return (
        currentUser !== null &&
        hasRequiredRole(
          currentUser.role,
          item.allowedRoles,
        )
      )
    })

  const displayName =
    currentUser?.first_name?.trim() ||
    currentUser?.username ||
    'ELEVEN User'

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join('')

  const isItemActive = (
    item: NavigationItem,
  ) => {
    if (!item.path) {
      return false
    }

    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard'
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(
        `${item.path}/`,
      )
    )
  }

  return (
    <Box
      component="aside"
      sx={{
        width: SIDEBAR_WIDTH,
        height: mobile ? '100%' : '100vh',
        display: mobile
          ? 'flex'
          : {
              xs: 'none',
              md: 'flex',
            },
        flexDirection: 'column',
        flexShrink: 0,
        boxSizing: 'border-box',
        borderRight: '1px solid',
        borderColor: '#e5e9f0',
        backgroundColor: '#ffffff',
        px: 2,
        py: 2.5,
        overflowY: 'auto',
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: 1,
          pb: 3.5,
        }}
      >
        <BrandLogo
          variant="horizontal"
          sx={{
            width: 190,
            maxHeight: 54,
            objectFit: 'contain',
            objectPosition: 'left center',
          }}
        />

        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.7,
            ml: 5.6,
            color: '#778198',
            letterSpacing: '0.13em',
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          CRM FOR ALTRIUM
        </Typography>
      </Box>

      {/* Main navigation */}
      <Stack spacing={0.45}>
        {visibleNavigationItems.map((item) => {
          const isActive =
            isItemActive(item)

          const isAvailable =
            item.available !== false

          return (
            <Button
              key={item.label}
              startIcon={item.icon}
              onClick={() =>
                handleNavigation(item)
              }
              aria-disabled={!isAvailable}
              sx={{
                position: 'relative',
                minHeight: 48,
                justifyContent: 'flex-start',
                gap: 0.8,
                px: 2,
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: 15,
                fontWeight: isActive
                  ? 700
                  : 500,
                color: isActive
                  ? '#0b5cff'
                  : '#26344d',
                backgroundColor: isActive
                  ? '#eef4ff'
                  : 'transparent',
                cursor: isAvailable
                  ? 'pointer'
                  : 'default',

                '& .MuiButton-startIcon': {
                  marginRight: 1,
                  color: isActive
                    ? '#0b5cff'
                    : '#34445f',

                  '& svg': {
                    fontSize: 22,
                  },
                },

                '&::before': isActive
                  ? {
                      content: '""',
                      position: 'absolute',
                      left: -8,
                      top: 7,
                      bottom: 7,
                      width: 3,
                      borderRadius: '0 3px 3px 0',
                      backgroundColor:
                        '#0b5cff',
                    }
                  : undefined,

                '&:hover': {
                  backgroundColor:
                    isActive
                      ? '#e8f0ff'
                      : isAvailable
                        ? '#f7f9fc'
                        : 'transparent',
                },
              }}
            >
              {item.label}
            </Button>
          )
        })}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      {/* Bottom utilities */}
      <Divider
        sx={{
          my: 2.2,
          borderColor: '#e4e8ef',
        }}
      />

      <Stack spacing={0.4}>
        <Button
          startIcon={<SettingsOutlined />}
          sx={{
            minHeight: 46,
            justifyContent: 'flex-start',
            px: 2,
            borderRadius: '8px',
            color: '#26344d',
            textTransform: 'none',
            fontSize: 15,
            fontWeight: 500,

            '& .MuiButton-startIcon svg': {
              fontSize: 22,
            },

            '&:hover': {
              backgroundColor: '#f7f9fc',
            },
          }}
        >
          Settings
        </Button>

        <Button
          startIcon={<LogoutRounded />}
          onClick={handleLogout}
          disabled={isLoggingOut}
          sx={{
            minHeight: 46,
            justifyContent: 'flex-start',
            px: 2,
            borderRadius: '8px',
            color: '#26344d',
            textTransform: 'none',
            fontSize: 15,
            fontWeight: 500,

            '& .MuiButton-startIcon svg': {
              fontSize: 22,
            },

            '&:hover': {
              backgroundColor: '#f7f9fc',
            },
          }}
        >
          {isLoggingOut
            ? 'Logging out...'
            : 'Log out'}
        </Button>
      </Stack>

      {/* Signed-in user card */}
      <Box
        sx={{
          mt: 2.2,
          p: 1.5,
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          border: '1px solid',
          borderColor: '#dfe4ec',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
        }}
      >
        <Avatar
          sx={{
            width: 42,
            height: 42,
            flexShrink: 0,
            backgroundColor: '#edf2ff',
            color: '#1548c7',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {initials || 'EU'}
        </Avatar>

        <Box
          sx={{
            minWidth: 0,
            flexGrow: 1,
          }}
        >
          <Typography
            sx={{
              color: '#111827',
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              color: '#68758c',
              fontSize: 11.5,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentUser?.role_display ??
              'Loading...'}
          </Typography>
        </Box>

        <KeyboardArrowDownRounded
          sx={{
            color: '#657087',
            fontSize: 20,
            flexShrink: 0,
          }}
        />
      </Box>
    </Box>
  )
}

export default AppSidebar