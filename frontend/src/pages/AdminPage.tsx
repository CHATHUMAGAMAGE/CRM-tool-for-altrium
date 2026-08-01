import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  AdminPanelSettingsOutlined,
  BlockOutlined,
  PeopleAltOutlined,
  PersonAddOutlined,
  PersonOutlineOutlined,
  RefreshOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'

import AdminCreateUserDialog from '../components/admin/AdminCreateUserDialog'
import AdminUserTable from '../components/admin/AdminUserTable'
import {
  getAdminDashboardSummary,
  type AdminDashboardSummary,
} from '../services/admin'

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to load the admin dashboard.'
}

function AdminPage() {
  const [summary, setSummary] =
    useState<AdminDashboardSummary | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] =
    useState(false)
  const [userTableKey, setUserTableKey] = useState(0)

  const loadSummary = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const dashboardSummary =
        await getAdminDashboardSummary()

      setSummary(dashboardSummary)
    } catch (error) {
      setSummary(null)
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void getAdminDashboardSummary()
      .then((dashboardSummary) => {
        if (!isMounted) {
          return
        }

        setSummary(dashboardSummary)
        setErrorMessage('')
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        setSummary(null)
        setErrorMessage(getErrorMessage(error))
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleUserCreated = () => {
    setUserTableKey((currentKey) => currentKey + 1)
    void loadSummary()
  }

  const summaryCards = [
    {
      title: 'Total users',
      value: summary?.total_users ?? 0,
      icon: <PeopleAltOutlined />,
      description: 'All registered employee accounts',
    },
    {
      title: 'Active users',
      value: summary?.active_users ?? 0,
      icon: <PersonOutlineOutlined />,
      description: 'Employees currently allowed to log in',
    },
    {
      title: 'Inactive users',
      value: summary?.inactive_users ?? 0,
      icon: <BlockOutlined />,
      description: 'Accounts currently deactivated',
    },
    {
      title: 'Administrators',
      value: summary?.role_counts.ADMIN ?? 0,
      icon: <AdminPanelSettingsOutlined />,
      description: 'Users with administrator privileges',
    },
  ]

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },
          mb: 4,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800 }}
          >
            Administration
          </Typography>

          <Typography
            sx={{
              color: 'text.secondary',
              mt: 1,
            }}
          >
            Manage ELEVEN CRM users, roles and account access.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Button
            variant="contained"
            startIcon={<PersonAddOutlined />}
            onClick={() => {
              setIsCreateDialogOpen(true)
            }}
          >
            Create employee
          </Button>

          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={() => void loadSummary()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>
      </Stack>

      {errorMessage && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void loadSummary()}
            >
              Retry
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {errorMessage}
        </Alert>
      )}

      {isLoading ? (
        <Box
          sx={{
            minHeight: 240,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Stack
            spacing={2}
            sx={{ alignItems: 'center' }}
          >
            <CircularProgress />

            <Typography color="text.secondary">
              Loading administration dashboard...
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 3,
          }}
        >
          {summaryCards.map((card) => (
            <Card
              key={card.title}
              variant="outlined"
              sx={{ height: '100%' }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    mb: 3,
                  }}
                >
                  {card.icon}
                </Box>

                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800 }}
                >
                  {card.value}
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    mt: 1,
                  }}
                >
                  {card.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mt: 1,
                  }}
                >
                  {card.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <AdminUserTable key={userTableKey} />

      <AdminCreateUserDialog
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false)
        }}
        onUserCreated={handleUserCreated}
      />
    </Box>
  )
}

export default AdminPage