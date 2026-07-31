import { useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { Outlet } from 'react-router'
import AppSidebar, {
  SIDEBAR_WIDTH,
} from '../components/navigation/AppSidebar'
import AppTopBar from '../components/navigation/AppTopBar'

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const openMobileMenu = () => {
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
        backgroundColor: '#f5f7fa',
      }}
    >
      {/* Permanent desktop sidebar */}
      <AppSidebar />

      {/* Temporary mobile sidebar */}
      <Drawer
        variant="temporary"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        sx={{
          display: { xs: 'block', md: 'none' },
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
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppTopBar onMenuClick={openMobileMenu} />

        <Box component="main" sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default AppShell