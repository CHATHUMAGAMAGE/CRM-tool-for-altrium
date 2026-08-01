import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  LockOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import {
  Link as RouterLink,
  useSearchParams,
} from 'react-router'

import BrandLogo from '../components/BrandLogo'
import { resetPassword } from '../services/auth'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()

  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const linkIsValid = Boolean(uid && token)

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setSuccessMessage('')

    if (!linkIsValid) {
      setError(
        'This password reset link is incomplete or invalid.',
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setError('The password confirmation does not match.')
      return
    }

    setIsLoading(true)

    try {
      const response = await resetPassword({
        uid,
        token,
        newPassword,
        confirmPassword,
      })

      setSuccessMessage(response.detail)
      setNewPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reset your password. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#f5f7fa',
      }}
    >
      <Box
        sx={{
          display: {
            xs: 'none',
            md: 'flex',
          },
          width: '50%',
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: {
            md: 6,
            lg: 8,
          },
          color: 'white',
          background:
            'radial-gradient(circle at 70% 35%, rgba(45, 125, 255, 0.45), transparent 35%), linear-gradient(145deg, #06152e 0%, #0b2a59 55%, #06162f 100%)',
        }}
      >
        <BrandLogo
          variant="horizontal"
          tone="light"
          sx={{
            width: {
              md: 235,
              lg: 270,
            },
            filter:
              'drop-shadow(0 8px 18px rgba(0,0,0,0.2))',
          }}
        />

        <Box sx={{ maxWidth: 600 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: {
                md: '3rem',
                lg: '4rem',
              },
              lineHeight: 1.05,
              mb: 3,
            }}
          >
            Create a New
            <br />
            Password
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Choose a strong password to securely regain access to
            your ELEVEN CRM account.
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          BUILT FOR ALTRIUM
        </Typography>
      </Box>

      <Box
        sx={{
          width: {
            xs: '100%',
            md: '50%',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 3,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 440,
          }}
        >
          <Paper
            elevation={2}
            sx={{
              padding: {
                xs: 3,
                sm: 4,
              },
              borderRadius: 3,
            }}
          >
            <BrandLogo
              variant="stacked"
              sx={{
                width: 145,
                maxHeight: 110,
                mx: 'auto',
                mb: 2,
              }}
            />

            <Typography
              variant="h4"
              sx={{
                fontWeight: 750,
                textAlign: 'center',
              }}
            >
              Reset Password
            </Typography>

            <Typography
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                mt: 1,
                mb: 4,
              }}
            >
              Enter and confirm your new password.
            </Typography>

            {!linkIsValid && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
              >
                This password reset link is incomplete or invalid.
              </Alert>
            )}

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
              >
                {error}
              </Alert>
            )}

            {successMessage && (
              <Alert
                severity="success"
                sx={{ mb: 3 }}
              >
                {successMessage}
              </Alert>
            )}

            {!successMessage && (
              <Box
                component="form"
                onSubmit={handleSubmit}
              >
                <Stack spacing={2.5}>
                  <TextField
                    label="New password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    required
                    fullWidth
                    autoComplete="new-password"
                    disabled={!linkIsValid}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlined />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              onClick={() =>
                                setShowPassword(
                                  (current) => !current,
                                )
                              }
                              edge="end"
                              aria-label={
                                showPassword
                                  ? 'Hide password'
                                  : 'Show password'
                              }
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Confirm password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                    fullWidth
                    autoComplete="new-password"
                    disabled={!linkIsValid}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlined />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isLoading || !linkIsValid}
                    sx={{
                      py: 1.4,
                      textTransform: 'none',
                      fontWeight: 700,
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress
                        size={24}
                        color="inherit"
                      />
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </Stack>
              </Box>
            )}

            <Button
              component={RouterLink}
              to="/login"
              startIcon={<ArrowBackRounded />}
              fullWidth
              sx={{
                mt: 2,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Back to Login
            </Button>
          </Paper>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              mt: 4,
            }}
          >
            © 2026 ELEVEN. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default ResetPasswordPage