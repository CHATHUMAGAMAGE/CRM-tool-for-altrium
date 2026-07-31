import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router'
import { ensureValidSession } from '../services/auth'

function PublicOnlyRoute() {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      const sessionIsValid = await ensureValidSession()

      if (isMounted) {
        setIsAuthenticated(sessionIsValid)
        setIsChecking(false)
      }
    }

    void checkSession()

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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute