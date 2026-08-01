import { useEffect, useState } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  MenuRounded,
  NotificationsNoneRounded,
  SearchRounded,
} from '@mui/icons-material'

import BrandLogo from '../BrandLogo'
import {
  getCurrentUser,
  type CurrentUser,
} from '../../services/auth'

type AppTopBarProps = {
  onMenuClick?: () => void
}

function AppTopBar({ onMenuClick }: AppTopBarProps) {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

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

  const displayName =
    currentUser?.first_name ||
    currentUser?.username ||
    'ELEVEN User'

  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton
          onClick={onMenuClick}
          sx={{
            display: {
              xs: 'inline-flex',
              md: 'none',
            },
          }}
          aria-label="Open navigation menu"
        >
          <MenuRounded />
        </IconButton>

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <BrandLogo
            variant="horizontal"
            sx={{
              width: {
                xs: 115,
                sm: 145,
              },
              maxHeight: 44,
            }}
          />
        </Box>

        <TextField
          size="small"
          placeholder="Search leads and customers..."
          sx={{
            width: 320,
            display: {
              xs: 'none',
              sm: 'block',
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded />
                </InputAdornment>
              ),
            },
          }}
        />

        <IconButton aria-label="Notifications">
          <NotificationsNoneRounded />
        </IconButton>

        <Stack
          direction="row"
          spacing={1.2}
          sx={{
            alignItems: 'center',
          }}
        >
          <Avatar
            sx={{
              width: 38,
              height: 38,
              fontWeight: 700,
              backgroundColor: '#0b2a59',
            }}
          >
            {initials}
          </Avatar>

          <Box
            sx={{
              display: {
                xs: 'none',
                sm: 'block',
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
              }}
            >
              {currentUser?.role_display ?? 'Loading...'}
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}

export default AppTopBar