import {
  useState,
  type FormEvent,
} from 'react'
import {
  DeleteForeverOutlined,
  WarningAmberOutlined,
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
  TextField,
  Typography,
} from '@mui/material'

import {
  deleteAdminUser,
  type AdminUser,
} from '../../services/admin'

interface AdminDeleteUserDialogProps {
  open: boolean
  user: AdminUser
  onClose: () => void
  onUserDeleted: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to delete the user.'
}

function AdminDeleteUserDialog({
  open,
  user,
  onClose,
  onUserDeleted,
}: AdminDeleteUserDialogProps) {
  const [confirmationText, setConfirmationText] =
    useState('')
  const [isSubmitting, setIsSubmitting] =
    useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isConfirmed =
    confirmationText.trim() === user.username

  const resetDialog = () => {
    setConfirmationText('')
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

    if (!isConfirmed) {
      setErrorMessage(
        'Enter the exact username to confirm deletion.',
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await deleteAdminUser(user.id)

      setIsSubmitting(false)
      resetDialog()
      onUserDeleted()
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
            <WarningAmberOutlined color="error" />

            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{ fontWeight: 800 }}
              >
                Delete employee account
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mt: 0.25,
                }}
              >
                Permanently remove this user from ELEVEN CRM.
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 3 }}>
            This action cannot be undone. The employee account,
            profile, login credentials and related removable data
            will be permanently deleted.
          </Alert>

          <Alert severity="warning" sx={{ mb: 3 }}>
            Users connected to protected CRM records cannot be
            deleted. Deactivate the account instead when the
            employee has existing leads, customers, activities or
            audit records.
          </Alert>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              Employee
            </Typography>

            <Typography
              sx={{
                fontWeight: 800,
                mt: 0.5,
              }}
            >
              {user.first_name || user.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.username}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Username: {user.username}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              Email: {user.email || 'Not provided'}
            </Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{ mb: 1 }}
          >
            Enter{' '}
            <Box
              component="span"
              sx={{ fontWeight: 800 }}
            >
              {user.username}
            </Box>{' '}
            to confirm:
          </Typography>

          <TextField
            label="Confirm username"
            value={confirmationText}
            onChange={(event) => {
              setConfirmationText(event.target.value)
              setErrorMessage('')
            }}
            placeholder={user.username}
            autoComplete="off"
            autoFocus
            fullWidth
            disabled={isSubmitting}
            error={
              confirmationText.length > 0 &&
              !isConfirmed
            }
            helperText={
              confirmationText.length > 0 &&
              !isConfirmed
                ? 'The username does not match.'
                : 'The username must match exactly.'
            }
          />
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
            color="error"
            startIcon={
              isSubmitting ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <DeleteForeverOutlined />
              )
            }
            disabled={
              isSubmitting ||
              !isConfirmed
            }
          >
            {isSubmitting
              ? 'Deleting account...'
              : 'Delete permanently'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default AdminDeleteUserDialog