import {
  useState,
  type FormEvent,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
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
  ContentCopyOutlined,
  LockOutlined,
  PersonOutlined,
  SecurityOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'

import {
  Link as RouterLink,
  useNavigate,
} from 'react-router'

import BrandLogo from '../components/BrandLogo'

import {
  confirmMFASetup,
  getCurrentUser,
  loginUser,
  startMFASetup,
  verifyMFAChallenge,
  type MFASetupDetails,
} from '../services/auth'


type AuthStage =
  | 'credentials'
  | 'mfa-setup'
  | 'mfa-verify'
  | 'recovery-codes'


function LoginPage() {
  const navigate =
    useNavigate()

  const [
    username,
    setUsername,
  ] =
    useState(
      '',
    )

  const [
    password,
    setPassword,
  ] =
    useState(
      '',
    )

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(
      false,
    )

  const [
    rememberMe,
    setRememberMe,
  ] =
    useState(
      false,
    )

  const [
    authStage,
    setAuthStage,
  ] =
    useState<AuthStage>(
      'credentials',
    )

  const [
    challengeToken,
    setChallengeToken,
  ] =
    useState(
      '',
    )

  const [
    mfaCode,
    setMfaCode,
  ] =
    useState(
      '',
    )

  const [
    mfaSetup,
    setMfaSetup,
  ] =
    useState<
      MFASetupDetails | null
    >(
      null,
    )

  const [
    recoveryCodes,
    setRecoveryCodes,
  ] =
    useState<string[]>(
      [],
    )

  const [
    usedRecoveryCode,
    setUsedRecoveryCode,
  ] =
    useState(
      false,
    )

  const [
    copiedRecoveryCodes,
    setCopiedRecoveryCodes,
  ] =
    useState(
      false,
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      false,
    )

  const [
    error,
    setError,
  ] =
    useState(
      '',
    )


  const finishLogin =
    async () => {
      await getCurrentUser()

      navigate(
        '/dashboard',
        {
          replace:
            true,
        },
      )
    }


  const resetSecurityFlow =
    () => {
      setAuthStage(
        'credentials',
      )

      setChallengeToken(
        '',
      )

      setMfaCode(
        '',
      )

      setMfaSetup(
        null,
      )

      setRecoveryCodes(
        [],
      )

      setUsedRecoveryCode(
        false,
      )

      setCopiedRecoveryCodes(
        false,
      )

      setError(
        '',
      )
    }


  const handleCredentialsSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()

      setError(
        '',
      )

      setIsLoading(
        true,
      )

      try {
        const result =
          await loginUser(
            username,
            password,
            rememberMe,
          )

        setPassword(
          '',
        )

        if (
          'mfa_setup_required'
          in result
        ) {
          setChallengeToken(
            result.challenge_token,
          )

          const setup =
            await startMFASetup(
              result.challenge_token,
            )

          setMfaSetup(
            setup,
          )

          setAuthStage(
            'mfa-setup',
          )

          return
        }

        if (
          'mfa_required'
          in result
        ) {
          setChallengeToken(
            result.challenge_token,
          )

          setAuthStage(
            'mfa-verify',
          )

          return
        }

        await finishLogin()
      } catch (
        requestError
      ) {
        setError(
          requestError
          instanceof Error
            ? requestError.message
            : (
              'Login failed. '
              + 'Please try again.'
            ),
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  const handleMFASetupConfirm =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()

      setError(
        '',
      )

      setIsLoading(
        true,
      )

      try {
        const result =
          await confirmMFASetup(
            challengeToken,
            mfaCode.trim(),
          )

        setMfaCode(
          '',
        )

        setRecoveryCodes(
          result.recovery_codes,
        )

        setAuthStage(
          'recovery-codes',
        )
      } catch (
        requestError
      ) {
        setError(
          requestError
          instanceof Error
            ? requestError.message
            : (
              'Unable to verify '
              + 'the authenticator code.'
            ),
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  const handleMFAVerify =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()

      setError(
        '',
      )

      setIsLoading(
        true,
      )

      try {
        const result =
          await verifyMFAChallenge(
            challengeToken,
            mfaCode.trim(),
          )

        setUsedRecoveryCode(
          result.used_recovery_code,
        )

        await finishLogin()
      } catch (
        requestError
      ) {
        setError(
          requestError
          instanceof Error
            ? requestError.message
            : (
              'Unable to verify '
              + 'the security code.'
            ),
        )
      } finally {
        setIsLoading(
          false,
        )
      }
    }


  const copyRecoveryCodes =
    async () => {
      try {
        await navigator.clipboard.writeText(
          recoveryCodes.join(
            '\n',
          ),
        )

        setCopiedRecoveryCodes(
          true,
        )
      } catch {
        setCopiedRecoveryCodes(
          false,
        )
      }
    }


  const renderError =
    error ? (
      <Alert
        severity="error"
      >
        {error}
      </Alert>
    ) : null


  const renderCredentials =
    () => (
      <Box
        component="form"
        onSubmit={
          handleCredentialsSubmit
        }
      >
        <Stack
          spacing={
            2.5
          }
        >
          {renderError}

          <TextField
            label="Username"
            placeholder="Enter your username"
            value={
              username
            }
            onChange={
              (
                event,
              ) =>
                setUsername(
                  event.target.value,
                )
            }
            required
            fullWidth
            autoComplete="username"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                  >
                    <PersonOutlined />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Password"
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            placeholder="Enter your password"
            value={
              password
            }
            onChange={
              (
                event,
              ) =>
                setPassword(
                  event.target.value,
                )
            }
            required
            fullWidth
            autoComplete="current-password"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment
                    position="start"
                  >
                    <LockOutlined />
                  </InputAdornment>
                ),

                endAdornment: (
                  <InputAdornment
                    position="end"
                  >
                    <IconButton
                      type="button"
                      onClick={
                        () =>
                          setShowPassword(
                            (
                              current,
                            ) =>
                              !current,
                          )
                      }
                      edge="end"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {
                        showPassword
                          ? (
                            <VisibilityOff />
                          )
                          : (
                            <Visibility />
                          )
                      }
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Stack
            direction="row"
            sx={{
              justifyContent:
                'space-between',

              alignItems:
                'center',
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    rememberMe
                  }
                  onChange={
                    (
                      event,
                    ) =>
                      setRememberMe(
                        event.target.checked,
                      )
                  }
                />
              }
              label="Remember me"
            />

            <Link
              component={
                RouterLink
              }
              to="/forgot-password"
              underline="hover"
              sx={{
                fontWeight:
                  600,
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
            disabled={
              isLoading
            }
            sx={{
              py:
                1.4,

              textTransform:
                'none',

              fontWeight:
                700,
            }}
          >
            {
              isLoading
                ? (
                  <CircularProgress
                    size={
                      24
                    }
                    color="inherit"
                  />
                )
                : (
                  'Login'
                )
            }
          </Button>
        </Stack>
      </Box>
    )


  const renderMFASetup =
    () => (
      <Box
        component="form"
        onSubmit={
          handleMFASetupConfirm
        }
      >
        <Stack
          spacing={
            2.25
          }
        >
          {renderError}

          <Alert
            severity="info"
            icon={
              <SecurityOutlined />
            }
          >
            This account requires multi-factor
            authentication. Scan the QR code with
            an authenticator app before continuing.
          </Alert>

          {
            mfaSetup && (
              <>
                <Box
                  component="img"
                  src={
                    mfaSetup.qr_code_data_url
                  }
                  alt="Authenticator setup QR code"
                  sx={{
                    width:
                      210,

                    height:
                      210,

                    maxWidth:
                      '100%',

                    mx:
                      'auto',

                    border:
                      '1px solid',

                    borderColor:
                      'divider',

                    borderRadius:
                      2,
                  }}
                />

                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        'text.secondary',

                      fontWeight:
                        700,
                    }}
                  >
                    MANUAL SETUP KEY
                  </Typography>

                  <Paper
                    variant="outlined"
                    sx={{
                      mt:
                        0.75,

                      p:
                        1.5,

                      fontFamily:
                        'monospace',

                      fontSize:
                        '0.9rem',

                      wordBreak:
                        'break-all',

                      textAlign:
                        'center',
                    }}
                  >
                    {
                      mfaSetup.secret
                    }
                  </Paper>
                </Box>
              </>
            )
          }

          <Divider />

          <TextField
            label="6-digit authenticator code"
            placeholder="000000"
            value={
              mfaCode
            }
            onChange={
              (
                event,
              ) =>
                setMfaCode(
                  event.target.value
                    .replace(
                      /\D/g,
                      '',
                    )
                    .slice(
                      0,
                      6,
                    ),
                )
            }
            required
            fullWidth
            autoFocus
            autoComplete="one-time-code"
            slotProps={{
              htmlInput: {
                inputMode:
                  'numeric',

                pattern:
                  '[0-9]{6}',
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={
              isLoading
              || mfaCode.length
              !== 6
            }
            fullWidth
            sx={{
              py:
                1.35,

              textTransform:
                'none',

              fontWeight:
                700,
            }}
          >
            {
              isLoading
                ? (
                  <CircularProgress
                    size={
                      24
                    }
                    color="inherit"
                  />
                )
                : (
                  'Verify and enable MFA'
                )
            }
          </Button>

          <Button
            type="button"
            variant="text"
            onClick={
              resetSecurityFlow
            }
            disabled={
              isLoading
            }
            sx={{
              textTransform:
                'none',
            }}
          >
            Back to sign in
          </Button>
        </Stack>
      </Box>
    )


  const renderMFAVerification =
    () => (
      <Box
        component="form"
        onSubmit={
          handleMFAVerify
        }
      >
        <Stack
          spacing={
            2.5
          }
        >
          {renderError}

          <Alert
            severity="info"
            icon={
              <SecurityOutlined />
            }
          >
            Password verified. Enter the current
            code from your authenticator app.
            A one-time recovery code also works.
          </Alert>

          {
            usedRecoveryCode && (
              <Alert
                severity="warning"
              >
                A recovery code was used and has
                now been permanently invalidated.
              </Alert>
            )
          }

          <TextField
            label="Authenticator or recovery code"
            placeholder="123456 or ABCD-EFGH"
            value={
              mfaCode
            }
            onChange={
              (
                event,
              ) =>
                setMfaCode(
                  event.target.value
                    .toUpperCase()
                    .slice(
                      0,
                      16,
                    ),
                )
            }
            required
            fullWidth
            autoFocus
            autoComplete="one-time-code"
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={
              isLoading
              || !mfaCode.trim()
            }
            sx={{
              py:
                1.35,

              textTransform:
                'none',

              fontWeight:
                700,
            }}
          >
            {
              isLoading
                ? (
                  <CircularProgress
                    size={
                      24
                    }
                    color="inherit"
                  />
                )
                : (
                  'Verify and sign in'
                )
            }
          </Button>

          <Button
            type="button"
            variant="text"
            onClick={
              resetSecurityFlow
            }
            disabled={
              isLoading
            }
            sx={{
              textTransform:
                'none',
            }}
          >
            Back to sign in
          </Button>
        </Stack>
      </Box>
    )


  const renderRecoveryCodes =
    () => (
      <Stack
        spacing={
          2.25
        }
      >
        <Alert
          severity="success"
        >
          MFA is enabled. Save these recovery
          codes now. Each code can be used only
          once and they will not be shown again.
        </Alert>

        <Paper
          variant="outlined"
          sx={{
            p:
              2,

            display:
              'grid',

            gridTemplateColumns:
              'repeat(2, minmax(0, 1fr))',

            gap:
              1,
          }}
        >
          {
            recoveryCodes.map(
              (
                code,
              ) => (
                <Typography
                  key={
                    code
                  }
                  sx={{
                    fontFamily:
                      'monospace',

                    fontWeight:
                      700,

                    textAlign:
                      'center',
                  }}
                >
                  {code}
                </Typography>
              ),
            )
          }
        </Paper>

        <Button
          type="button"
          variant="outlined"
          startIcon={
            <ContentCopyOutlined />
          }
          onClick={
            () => {
              void copyRecoveryCodes()
            }
          }
          sx={{
            textTransform:
              'none',
          }}
        >
          {
            copiedRecoveryCodes
              ? 'Recovery codes copied'
              : 'Copy recovery codes'
          }
        </Button>

        <Button
          type="button"
          variant="contained"
          size="large"
          onClick={
            () => {
              setIsLoading(
                true,
              )

              void finishLogin()
                .catch(
                  (
                    requestError,
                  ) => {
                    setError(
                      requestError
                      instanceof Error
                        ? requestError.message
                        : (
                          'Unable to complete sign in.'
                        ),
                    )
                  },
                )
                .finally(
                  () => {
                    setIsLoading(
                      false,
                    )
                  },
                )
            }
          }
          disabled={
            isLoading
          }
          sx={{
            py:
              1.35,

            textTransform:
              'none',

            fontWeight:
              700,
          }}
        >
          {
            isLoading
              ? (
                <CircularProgress
                  size={
                    24
                  }
                  color="inherit"
                />
              )
              : (
                'I saved these codes — continue'
              )
          }
        </Button>

        {renderError}
      </Stack>
    )


  const securityTitle =
    authStage ===
    'mfa-setup'
      ? 'Secure Your Account'
      : authStage ===
        'mfa-verify'
        ? 'Security Verification'
        : authStage ===
          'recovery-codes'
          ? 'Recovery Codes'
          : 'Welcome Back'


  const securitySubtitle =
    authStage ===
    'credentials'
      ? 'Sign in to access ELEVEN'
      : authStage ===
        'mfa-setup'
        ? (
          'Set up an authenticator app '
          + 'before entering ELEVEN'
        )
        : authStage ===
          'mfa-verify'
          ? (
            'Complete multi-factor authentication '
            + 'to access ELEVEN'
          )
          : (
            'Keep these one-time codes '
            + 'somewhere secure'
          )


  return (
    <Box
      sx={{
        minHeight:
          '100vh',

        display:
          'flex',

        backgroundColor:
          '#f5f7fa',
      }}
    >
      <Box
        sx={{
          display: {
            xs:
              'none',

            md:
              'flex',
          },

          width:
            '50%',

          position:
            'relative',

          overflow:
            'hidden',

          flexDirection:
            'column',

          justifyContent:
            'space-between',

          padding: {
            md:
              6,

            lg:
              8,
          },

          color:
            'white',

          background:
            'radial-gradient(circle at 70% 35%, rgba(45, 125, 255, 0.45), transparent 35%), linear-gradient(145deg, #06152e 0%, #0b2a59 55%, #06162f 100%)',
        }}
      >
        <BrandLogo
          variant="horizontal"
          tone="light"
          sx={{
            width: {
              md:
                235,

              lg:
                270,
            },

            filter:
              'drop-shadow(0 8px 18px rgba(0,0,0,0.2))',
          }}
        />

        <Box
          sx={{
            maxWidth:
              600,
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight:
                800,

              fontSize: {
                md:
                  '3rem',

                lg:
                  '4rem',
              },

              lineHeight:
                1.05,

              mb:
                3,
            }}
          >
            Lead Management
            <br />
            Made Simple
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color:
                'rgba(255,255,255,0.78)',

              lineHeight:
                1.7,

              fontWeight:
                400,
            }}
          >
            Manage leads, assignments, follow-ups and customer
            conversions from one secure, centralized platform.
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color:
              'rgba(255,255,255,0.55)',

            letterSpacing:
              2,

            fontWeight:
              700,
          }}
        >
          BUILT FOR ALTRIUM
        </Typography>
      </Box>

      <Box
        sx={{
          width: {
            xs:
              '100%',

            md:
              '50%',
          },

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          padding:
            3,
        }}
      >
        <Box
          sx={{
            width:
              '100%',

            maxWidth:
              460,
          }}
        >
          <Paper
            elevation={
              2
            }
            sx={{
              padding: {
                xs:
                  3,

                sm:
                  4,
              },

              borderRadius:
                3,
            }}
          >
            <BrandLogo
              variant="stacked"
              sx={{
                width:
                  150,

                maxHeight:
                  115,

                mx:
                  'auto',

                mb:
                  2,
              }}
            />

            <Typography
              variant="h4"
              sx={{
                fontWeight:
                  750,

                textAlign:
                  'center',
              }}
            >
              {
                securityTitle
              }
            </Typography>

            <Typography
              sx={{
                color:
                  'text.secondary',

                textAlign:
                  'center',

                mt:
                  0.5,

                mb:
                  4,
              }}
            >
              {
                securitySubtitle
              }
            </Typography>

            {
              authStage ===
              'credentials'
                ? renderCredentials()
                : authStage ===
                  'mfa-setup'
                  ? renderMFASetup()
                  : authStage ===
                    'mfa-verify'
                    ? renderMFAVerification()
                    : renderRecoveryCodes()
            }
          </Paper>

          <Typography
            variant="body2"
            sx={{
              color:
                'text.secondary',

              textAlign:
                'center',

              mt:
                4,
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
