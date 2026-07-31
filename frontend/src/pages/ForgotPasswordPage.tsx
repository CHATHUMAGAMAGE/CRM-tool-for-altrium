import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  EmailOutlined,
  GridViewRounded,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router'

import { forgotPassword } from '../services/auth'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const response = await forgotPassword(email)
      setSuccessMessage(response.detail)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to process your request. Please try again.',
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
          display: { xs: 'none', md: 'flex' },
          width: '50%',
          position: 'relative',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 8,
          color: 'white',
          background:
            'radial-gradient(circle at 70% 35%, rgba(45, 125, 255, 0.45), transparent 35%), linear-gradient(145deg, #06152e 0%, #0b2a59 55%, #06162f 100%)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: '#0866e5',
            }}
          >
            <GridViewRounded fontSize="large" />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            ELEVEN
          </Typography>
        </Stack>

        <Box sx={{ maxWidth: 600 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { md: '3rem', lg: '4rem' },
              lineHeight: 1.05,
              mb: 3,
            }}
          >
            Secure Account
            <br />
            Recovery
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Request a secure password-reset link for your ELEVEN CRM
            account.
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          BUILT FOR ALTRIUM
        </Typography>
      </Box>

      <Box
        sx={{
          width: { xs: '100%', md: '50%' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Paper
            elevation={2}
            sx={{
              padding: { xs: 3, sm: 4 },
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 750 }}>
              Forgot Password?
            </Typography>

            <Typography
              sx={{
                color: 'text.secondary',
                mt: 1,
                mb: 4,
              }}
            >
              Enter the email address connected to your account. If
              the account exists, we will send you a reset link.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}

                {successMessage && (
                  <Alert severity="success">
                    {successMessage}
                  </Alert>
                )}

                <TextField
                  label="Email address"
                  type="email"
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <EmailOutlined
                          sx={{
                            mr: 1,
                            color: 'text.secondary',
                          }}
                        />
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isLoading}
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
                    'Send Reset Link'
                  )}
                </Button>

                <Button
                  component={RouterLink}
                  to="/login"
                  startIcon={<ArrowBackRounded />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </Box>
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

export default ForgotPasswordPage