import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  RefreshOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import type { UserRole } from '../../auth/roles'
import {
  getAdminUsers,
  type AdminUser,
  type AdminUserFilters,
} from '../../services/admin'

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MARKETING: 'Marketing Employee',
  SALES_REP: 'Sales Representative',
  SALES_MANAGER: 'Sales Manager',
  PROJECT_MANAGER: 'Project Manager',
  SOFTWARE_ENGINEER: 'Software Engineer',
  DIRECTOR: 'Director',
}

const roleOptions = Object.entries(roleLabels) as [
  UserRole,
  string,
][]

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to load users.'
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getFullName(user: AdminUser): string {
  const fullName = [
    user.first_name,
    user.last_name,
  ]
    .filter((value) => value?.trim())
    .join(' ')

  return fullName || user.username
}

function getRoleLabel(user: AdminUser): string {
  const displayLabel = user.role_display?.trim()

  if (displayLabel) {
    return displayLabel
  }

  return roleLabels[user.role] || 'Unassigned'
}

function AdminUserTable() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] =
    useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] =
    useState<'active' | 'inactive' | ''>('')

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadUsers = useCallback(
    async (filters: AdminUserFilters = {}) => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const userList = await getAdminUsers(filters)
        setUsers(userList)
      } catch (error) {
        setUsers([])
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let isMounted = true

    void getAdminUsers()
      .then((userList) => {
        if (!isMounted) {
          return
        }

        setUsers(userList)
        setErrorMessage('')
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        setUsers([])
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

  const applyFilters = () => {
    void loadUsers({
      search: searchText,
      role: roleFilter,
      status: statusFilter,
    })
  }

  const resetFilters = () => {
    setSearchText('')
    setRoleFilter('')
    setStatusFilter('')
    void loadUsers()
  }

  return (
    <Card variant="outlined" sx={{ mt: 4 }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            justifyContent: 'space-between',
            alignItems: {
              xs: 'flex-start',
              sm: 'center',
            },
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              User management
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Search and filter employee accounts.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={applyFilters}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(240px, 2fr) 1fr 1fr auto auto',
            },
            gap: 2,
            alignItems: 'center',
            mb: 3,
          }}
        >
          <TextField
            label="Search users"
            placeholder="Name, username or email"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applyFilters()
              }
            }}
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl size="small">
            <InputLabel id="admin-role-filter-label">
              Role
            </InputLabel>

            <Select
              labelId="admin-role-filter-label"
              label="Role"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(
                  event.target.value as UserRole | '',
                )
              }}
            >
              <MenuItem value="">All roles</MenuItem>

              {roleOptions.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel id="admin-status-filter-label">
              Status
            </InputLabel>

            <Select
              labelId="admin-status-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as
                    | 'active'
                    | 'inactive'
                    | '',
                )
              }}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">
                Inactive
              </MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={applyFilters}
            disabled={isLoading}
          >
            Apply
          </Button>

          <Button
            variant="text"
            onClick={resetFilters}
            disabled={isLoading}
          >
            Reset
          </Button>
        </Box>

        {errorMessage && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={applyFilters}
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
              minHeight: 220,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />

              <Typography
                sx={{
                  color: 'text.secondary',
                  mt: 2,
                }}
              >
                Loading users...
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 2,
              }}
            >
              {users.length}{' '}
              {users.length === 1 ? 'user' : 'users'} found
            </Typography>

            <TableContainer
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflowX: 'auto',
              }}
            >
              <Table sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Last login</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Box
                          sx={{
                            py: 5,
                            textAlign: 'center',
                          }}
                        >
                          <Typography
                            sx={{ fontWeight: 700 }}
                          >
                            No users found
                          </Typography>

                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              mt: 1,
                            }}
                          >
                            Try changing the search or filter
                            values.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{
                          '&:last-child td': {
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                          >
                            {getFullName(user)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {user.username}
                        </TableCell>

                        <TableCell>
                          {user.email || 'Not provided'}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={getRoleLabel(user)}
                            size="small"
                            variant="outlined"
                            sx={{
                              minWidth: 110,
                              justifyContent: 'center',
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              user.is_active
                                ? 'Active'
                                : 'Inactive'
                            }
                            size="small"
                            color={
                              user.is_active
                                ? 'success'
                                : 'default'
                            }
                          />
                        </TableCell>

                        <TableCell>
                          {user.phone_number ||
                            'Not provided'}
                        </TableCell>

                        <TableCell>
                          {formatDate(user.last_login)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default AdminUserTable