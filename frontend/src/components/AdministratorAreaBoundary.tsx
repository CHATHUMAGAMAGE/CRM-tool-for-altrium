import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router'

import { getCurrentUser } from '../services/auth'


function AdministratorAreaBoundary() {
  const location = useLocation()
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void getCurrentUser()
      .then((user) => mounted && setRole(user.role))
      .finally(() => mounted && setIsLoading(false))
    return () => { mounted = false }
  }, [])

  if (isLoading) {
    return (
      <Box sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={30} />
      </Box>
    )
  }

  if (role === 'ADMIN' && location.pathname !== '/admin') {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}


export default AdministratorAreaBoundary
