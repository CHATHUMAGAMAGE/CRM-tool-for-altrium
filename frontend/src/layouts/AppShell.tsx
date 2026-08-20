import { useState } from 'react'
import {
  Box,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Outlet } from 'react-router'

import AppSidebar, {
  SIDEBAR_WIDTH,
} from '../components/navigation/AppSidebar'
import AppTopBar from '../components/navigation/AppTopBar'

function AppShell() {
  const theme = useTheme()

  const isDesktop = useMediaQuery(
    theme.breakpoints.up('md'),
  )

  const [desktopSidebarOpen, setDesktopSidebarOpen] =
    useState(true)

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const handleMenuClick = () => {
    if (isDesktop) {
      setDesktopSidebarOpen(
        (current) => !current,
      )
      return
    }

    setMobileMenuOpen(true)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#f7f9fc',
      }}
    >
      {/* Desktop sidebar */}
      {desktopSidebarOpen && (
        <AppSidebar />
      )}

      {/* Mobile sidebar */}
      <Drawer
        variant="temporary"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: {
            xs: 'block',
            md: 'none',
          },

          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <AppSidebar
          mobile
          onNavigate={closeMobileMenu}
        />
      </Drawer>

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppTopBar
          onMenuClick={handleMenuClick}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default AppShell