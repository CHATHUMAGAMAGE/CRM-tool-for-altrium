import {
  useState,
  type FormEvent,
} from 'react'
import {
  EditOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import type { UserRole } from '../../auth/roles'
import {
  updateAdminUser,
  type AdminUser,
} from '../../services/admin'

interface AdminEditUserDialogProps {
  open: boolean
  user: AdminUser
  onClose: () => void
  onUserUpdated: () => void
}

interface EditUserFormState {
  username: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  role: UserRole
  isActive: boolean
}

const roleOptions: Array<{
  value: UserRole
  label: string
}> = [
  {
    value: 'ADMIN',
    label: 'Administrator',
  },
  {
    value: 'MARKETING',
    label: 'Marketing Employee',
  },
  {
    value: 'SALES_REP',
    label: 'Sales Representative',
  },
  {
    value: 'SALES_MANAGER',
    label: 'Sales Manager',
  },
  {
    value: 'PROJECT_MANAGER',
    label: 'Project Manager',
  },
  {
    value: 'SOFTWARE_ENGINEER',
    label: 'Software Engineer',
  },
  {
    value: 'DIRECTOR',
    label: 'Director',
  },
]

function createInitialFormState(
  user: AdminUser,
): EditUserFormState {
  return {
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phoneNumber: user.phone_number,
    role: user.role,
    isActive: user.is_active,
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to update the user.'
}

function AdminEditUserDialog({
  open,
  user,
  onClose,
  onUserUpdated,
}: AdminEditUserDialogProps) {
  const [formState, setFormState] =
    useState<EditUserFormState>(() =>
      createInitialFormState(user),
    )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialog = () => {
    setFormState(createInitialFormState(user))
    setErrorMessage('')
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    resetDialog()
    onClose()
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await updateAdminUser(user.id, {
        username: formState.username.trim(),
        first_name: formState.firstName.trim(),
        last_name: formState.lastName.trim(),
        email: formState.email.trim(),
        phone_number: formState.phoneNumber.trim(),
        role: formState.role,
        is_active: formState.isActive,
      })

      setIsSubmitting(false)
      onUserUpdated()
      onClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <Box
        component="form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <EditOutlined color="primary" />

            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 800 }}
              >
                Edit employee account
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mt: 0.25,
                }}
              >
                Update account details, role and access status.
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

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
              value={formState.firstName}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }}
              required
              autoFocus
              fullWidth
              disabled={isSubmitting}
            />

            <TextField
              label="Last name"
              value={formState.lastName}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }}
              required
              fullWidth
              disabled={isSubmitting}
            />

            <TextField
              label="Username"
              value={formState.username}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }}
              required
              fullWidth
              disabled={isSubmitting}
              helperText="Must be unique."
            />

            <TextField
              label="Email address"
              type="email"
              value={formState.email}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }}
              required
              fullWidth
              disabled={isSubmitting}
              helperText="Must be unique."
            />

            <TextField
              label="Phone number"
              type="tel"
              value={formState.phoneNumber}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }}
              fullWidth
              disabled={isSubmitting}
            />

            <TextField
              select
              label="Role"
              value={formState.role}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                }))
              }}
              required
              fullWidth
              disabled={isSubmitting}
            >
              {roleOptions.map((role) => (
                <MenuItem
                  key={role.value}
                  value={role.value}
                >
                  {role.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box
            sx={{
              mt: 3,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formState.isActive}
                  onChange={(event) => {
                    setFormState((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }}
                  disabled={isSubmitting}
                />
              }
              label={
                formState.isActive
                  ? 'Account is active'
                  : 'Account is inactive'
              }
            />

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Deactivating an account prevents the employee from
              logging in and invalidates their active sessions.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            startIcon={
              isSubmitting ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <EditOutlined />
              )
            }
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving changes...'
              : 'Save changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default AdminEditUserDialog