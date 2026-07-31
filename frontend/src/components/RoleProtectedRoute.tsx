import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router'
import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'
import {
  hasRequiredRole,
  type UserRole,
} from '../auth/roles'

type RoleProtectedRouteProps = {
  allowedRoles: UserRole[]
}

function RoleProtectedRoute({
  allowedRoles,
}: RoleProtectedRouteProps) {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const checkRole = async () => {
      try {
        const user = await getCurrentUser()

        if (isMounted) {
          setCurrentUser(user)
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null)
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    void checkRole()

    return () => {
      isMounted = false
    }
  }, [])

  if (isChecking) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (
    !currentUser ||
    !hasRequiredRole(currentUser.role, allowedRoles)
  ) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default RoleProtectedRoute