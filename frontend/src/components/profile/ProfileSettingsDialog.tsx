import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react'

import {
  AutoAwesomeRounded,
  CloseRounded,
  DarkModeRounded,
  DeleteOutlineRounded,
  LightModeRounded,
  PhotoCameraRounded,
} from '@mui/icons-material'

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

import {
  useAppearance,
  type AppearanceMode,
} from '../../appearance/AppearanceProvider'

import {
  updateCurrentUserProfile,
  type CurrentUser,
} from '../../services/auth'


type ProfileSettingsDialogProps = {
  open: boolean
  user: CurrentUser | null
  onClose: () => void
}


function getDisplayName(user: CurrentUser | null): string {
  if (!user) {
    return 'ELEVEN User'
  }

  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || user.username
}


function getInitials(user: CurrentUser | null): string {
  return getDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'EU'
}


function ProfileSettingsDialog({
  open,
  user,
  onClose,
}: ProfileSettingsDialogProps) {
  const {
    appearance,
    resolvedMode,
    setAppearance,
  } = useAppearance()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!open || !user) {
      return
    }

    setFirstName(user.first_name || '')
    setLastName(user.last_name || '')
    setPhoneNumber(user.phone_number || '')
    setAvatarFile(null)
    setRemoveAvatar(false)
    setErrorMessage('')
    setSuccessMessage('')
  }, [open, user])

  const previewUrl = useMemo(() => {
    if (!avatarFile) {
      return null
    }

    return URL.createObjectURL(avatarFile)
  }, [avatarFile])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const avatarSource = removeAvatar
    ? undefined
    : previewUrl || user?.avatar_url || undefined

  const handleAvatarSelection = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])

    if (!allowedTypes.has(file.type)) {
      setErrorMessage(
        'Use a JPEG, PNG, or WebP profile picture.',
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        'Profile pictures must be 5 MB or smaller.',
      )
      return
    }

    setAvatarFile(file)
    setRemoveAvatar(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleSave = async () => {
    if (!user || isSaving) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateCurrentUserProfile({
        firstName,
        lastName,
        phoneNumber,
        avatarFile,
        removeAvatar,
      })

      setAvatarFile(null)
      setRemoveAvatar(false)
      setSuccessMessage('Profile updated successfully.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your profile.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleAppearanceChange = (
    _event: MouseEvent<HTMLElement>,
    value: AppearanceMode | null,
  ) => {
    if (value) {
      setAppearance(value)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSaving) {
          onClose()
        }
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              Profile & appearance
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.25 }}
            >
              Update your profile picture, contact details and theme.
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close profile settings"
          >
            <CloseRounded />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {errorMessage && (
            <Alert severity="error">
              {errorMessage}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success">
              {successMessage}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.25}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <Avatar
              src={avatarSource}
              alt={getDisplayName(user)}
              sx={{
                width: 92,
                height: 92,
                bgcolor: 'action.selected',
                color: 'primary.main',
                fontSize: 26,
                fontWeight: 800,
                border: '3px solid',
                borderColor: 'divider',
              }}
            >
              {getInitials(user)}
            </Avatar>

            <Box>
              <Typography sx={{ fontWeight: 800 }}>
                Profile picture
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.35, mb: 1.5 }}
              >
                JPEG, PNG or WebP. Maximum 5 MB.
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', rowGap: 1 }}
              >
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<PhotoCameraRounded />}
                  disabled={isSaving}
                >
                  Change photo

                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelection}
                  />
                </Button>

                {(user?.avatar_url || avatarFile) && !removeAvatar && (
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRounded />}
                    onClick={() => {
                      setAvatarFile(null)
                      setRemoveAvatar(true)
                      setSuccessMessage('')
                    }}
                    disabled={isSaving}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Box>
          </Stack>

          <Divider />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              label="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isSaving}
              fullWidth
            />

            <TextField
              label="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isSaving}
              fullWidth
            />

            <TextField
              label="Phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              disabled={isSaving}
              fullWidth
            />

            <TextField
              label="Role"
              value={user?.role_display || ''}
              disabled
              fullWidth
              helperText="Roles are managed by an administrator."
            />

            <TextField
              label="Username"
              value={user?.username || ''}
              disabled
              fullWidth
            />

            <TextField
              label="Email"
              value={user?.email || ''}
              disabled
              fullWidth
            />
          </Box>

          <Divider />

          <Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', mb: 1 }}
            >
              <AutoAwesomeRounded color="primary" />

              <Typography sx={{ fontWeight: 800 }}>
                Appearance
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.5 }}
            >
              Theme changes are applied immediately and remembered on this device.
              {' '}Current system result: {resolvedMode}.
            </Typography>

            <ToggleButtonGroup
              exclusive
              value={appearance}
              onChange={handleAppearanceChange}
              fullWidth
              color="primary"
            >
              <ToggleButton value="light">
                <LightModeRounded sx={{ mr: 1 }} />
                Light
              </ToggleButton>

              <ToggleButton value="dark">
                <DarkModeRounded sx={{ mr: 1 }} />
                Dark
              </ToggleButton>

              <ToggleButton value="system">
                <AutoAwesomeRounded sx={{ mr: 1 }} />
                System
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={isSaving}
        >
          Close
        </Button>

        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={isSaving || !user}
          startIcon={
            isSaving
              ? <CircularProgress size={18} color="inherit" />
              : undefined
          }
        >
          {isSaving ? 'Saving...' : 'Save profile'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}


export default ProfileSettingsDialog
