import {
  useState,
  type FormEvent,
} from 'react'
import {
  PersonAddOutlined,
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
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'

import {
  ADMIN_ASSIGNABLE_ROLE_OPTIONS,
  type UserRole,
} from '../../auth/roles'
import { createAdminUser } from '../../services/admin'

interface AdminCreateUserDialogProps {
  open: boolean
  onClose: () => void
  onUserCreated: () => void
}

interface CreateUserFormState {
  firstName: string
  lastName: string
  username: string
  email: string
  phoneNumber: string
  role: UserRole
}

const initialFormState: CreateUserFormState = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phoneNumber: '',
  role: 'SALES_REP',
}

const roleOptions = ADMIN_ASSIGNABLE_ROLE_OPTIONS

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to create the employee account.'
}

function AdminCreateUserDialog({
  open,
  onClose,
  onUserCreated,
}: AdminCreateUserDialogProps) {
  const [formState, setFormState] =
    useState<CreateUserFormState>(initialFormState)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialog = () => {
    setFormState(initialFormState)
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
      await createAdminUser({
        first_name: formState.firstName.trim(),
        last_name: formState.lastName.trim(),
        username: formState.username.trim(),
        email: formState.email.trim(),
        phone_number: formState.phoneNumber.trim(),
        role: formState.role,
      })

      setIsSubmitting(false)
      resetDialog()
      onUserCreated()
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
            <PersonAddOutlined color="primary" />

            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 800 }}
              >
                Create employee account
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mt: 0.25,
                }}
              >
                Register a new ELEVEN CRM user.
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            The administrator will not create or see the
            employee&apos;s password. A secure password-setup
            link will be sent to the employee&apos;s email address.
          </Alert>

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
              helperText="Used by the employee to log in."
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
              helperText="The password-setup link will be sent here."
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
                <PersonAddOutlined />
              )
            }
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating account...'
              : 'Create account'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default AdminCreateUserDialog