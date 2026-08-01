import { useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  LockOutlined,
  PersonOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import {
  Link as RouterLink,
  useNavigate,
} from 'react-router'

import BrandLogo from '../components/BrandLogo'
import {
  getCurrentUser,
  loginUser,
} from '../services/auth'

function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setIsLoading(true)

    try {
      const tokens = await loginUser(username, password)

      localStorage.setItem('accessToken', tokens.access)
      localStorage.setItem('refreshToken', tokens.refresh)

      await getCurrentUser()

      navigate('/dashboard', {
        replace: true,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Login failed. Please try again.',
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
            Lead Management
            <br />
            Made Simple
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.78)',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Manage leads, assignments, follow-ups and customer
            conversions from one secure, centralized platform.
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
                width: 150,
                maxHeight: 115,
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
              Welcome Back
            </Typography>

            <Typography
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
                mt: 0.5,
                mb: 4,
              }}
            >
              Sign in to access ELEVEN
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
            >
              <Stack spacing={2.5}>
                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}

                <TextField
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  required
                  fullWidth
                  autoComplete="username"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  fullWidth
                  autoComplete="current-password"
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

                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Remember me"
                  />

                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    underline="hover"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    Forgot password?
                  </Link>
                </Stack>

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
                    'Login'
                  )}
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

export default LoginPage