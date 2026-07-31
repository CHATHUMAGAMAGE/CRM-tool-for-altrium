import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import {
  AdminPanelSettingsOutlined,
  DashboardRounded,
  LogoutRounded,
  PeopleAltOutlined,
  SettingsOutlined,
  ViewKanbanOutlined,
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router'

import {
  getCurrentUser,
  logoutUser,
  type CurrentUser,
} from '../../services/auth'
import {
  hasRequiredRole,
  type UserRole,
} from '../../auth/roles'

export const SIDEBAR_WIDTH = 260

type NavigationItem = {
  label: string
  path: string
  icon: React.ReactNode
  allowedRoles?: UserRole[]
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardRounded />,
  },
  {
    label: 'Leads',
    path: '/leads',
    icon: <ViewKanbanOutlined />,
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: <PeopleAltOutlined />,
  },
  {
    label: 'Administration',
    path: '/admin',
    icon: <AdminPanelSettingsOutlined />,
    allowedRoles: ['ADMIN'],
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

  const [isLoggingOut, setIsLoggingOut] = useState(false)

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

  const handleNavigation = (path: string) => {
    navigate(path)
    onNavigate?.()
  }

  const handleLogout = () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    /*
     * logoutUser clears the browser tokens immediately,
     * then blacklists the refresh token in the background.
     */
    void logoutUser()

    onNavigate?.()

    navigate('/login', {
      replace: true,
    })
  }

  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!item.allowedRoles) {
      return true
    }

    return (
      currentUser !== null &&
      hasRequiredRole(currentUser.role, item.allowedRoles)
    )
  })

  return (
    <Box
      component="aside"
      sx={{
        width: SIDEBAR_WIDTH,
        minHeight: mobile ? '100%' : '100vh',
        display: mobile
          ? 'flex'
          : {
              xs: 'none',
              md: 'flex',
            },
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: '#ffffff',
        p: 3,
      }}
    >
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 900,
          }}
        >
          ELEVEN
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            letterSpacing: 1.5,
            fontWeight: 700,
          }}
        >
          CRM FOR ALTRIUM
        </Typography>
      </Box>

      <Stack spacing={1}>
        {visibleNavigationItems.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <Button
              key={item.path}
              startIcon={item.icon}
              variant={isActive ? 'contained' : 'text'}
              color={isActive ? 'primary' : 'inherit'}
              onClick={() => handleNavigation(item.path)}
              sx={{
                justifyContent: 'flex-start',
                px: 2,
                py: 1.2,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              {item.label}
            </Button>
          )
        })}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ mb: 2 }} />

      <Stack spacing={1}>
        <Button
          startIcon={<SettingsOutlined />}
          color="inherit"
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
          }}
        >
          Settings
        </Button>

        <Button
          startIcon={<LogoutRounded />}
          color="inherit"
          onClick={handleLogout}
          disabled={isLoggingOut}
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
          }}
        >
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </Stack>
    </Box>
  )
}

export default AppSidebar