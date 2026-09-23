import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router'
import { ensureValidSession } from '../services/auth'
import { useAuthSessionState } from '../auth/useAuthSessionState'

function PublicOnlyRoute() {
  const sessionState = useAuthSessionState()
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean | null>(null)

  const isExplicitlyLoggedOut =
    sessionState === 'logging_out' ||
    sessionState === 'logged_out'

  useEffect(() => {
    let isMounted = true

    if (isExplicitlyLoggedOut) {
      return () => { isMounted = false }
    }

    const checkSession = async () => {
      const sessionIsValid = await ensureValidSession()

      if (isMounted) {
        setIsAuthenticated(sessionIsValid)
      }
    }

    void checkSession()

    return () => {
      isMounted = false
    }
  }, [isExplicitlyLoggedOut, sessionState])

  if (isExplicitlyLoggedOut) {
    return <Outlet />
  }

  if (isAuthenticated === null) {
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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
