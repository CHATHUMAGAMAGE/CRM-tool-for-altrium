import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
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
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material'

import type { UserRole } from '../../auth/roles'
import {
  getAdminUsers,
  sendAdminPasswordResetEmail,
  type AdminUser,
  type AdminUserFilters,
} from '../../services/admin'
import AdminDeleteUserDialog from './AdminDeleteUserDialog'
import AdminEditUserDialog from './AdminEditUserDialog'

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
    : 'Unable to complete the requested action.'
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
  const [successMessage, setSuccessMessage] = useState('')

  const [selectedEditUser, setSelectedEditUser] =
    useState<AdminUser | null>(null)

  const [selectedDeleteUser, setSelectedDeleteUser] =
    useState<AdminUser | null>(null)

  const [emailActionUserId, setEmailActionUserId] =
    useState<number | null>(null)

  const getCurrentFilters =
    useCallback((): AdminUserFilters => {
      return {
        search: searchText,
        role: roleFilter,
        status: statusFilter,
      }
    }, [
      roleFilter,
      searchText,
      statusFilter,
    ])

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
    setSuccessMessage('')
    void loadUsers(getCurrentFilters())
  }

  const resetFilters = () => {
    setSearchText('')
    setRoleFilter('')
    setStatusFilter('')
    setSuccessMessage('')
    void loadUsers()
  }

  const handleUserUpdated = () => {
    setSuccessMessage(
      'Employee account updated successfully.',
    )
    setErrorMessage('')
    void loadUsers(getCurrentFilters())
  }

  const handleUserDeleted = () => {
    setSuccessMessage(
      'Employee account deleted successfully.',
    )
    setErrorMessage('')
    void loadUsers(getCurrentFilters())
  }

  const handleSendPasswordEmail = async (
    user: AdminUser,
  ) => {
    setEmailActionUserId(user.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await sendAdminPasswordResetEmail(user.id)

      setSuccessMessage(response.detail)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setEmailActionUserId(null)
    }
  }

  return (
    <>
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
                Search, edit and manage employee accounts.
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
                md: (
                  'minmax(240px, 2fr) ' +
                  '1fr 1fr auto auto'
                ),
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
                <MenuItem value="">
                  All statuses
                </MenuItem>

                <MenuItem value="active">
                  Active
                </MenuItem>

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

          {successMessage && (
            <Alert
              severity="success"
              onClose={() => {
                setSuccessMessage('')
              }}
              sx={{ mb: 3 }}
            >
              {successMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert
              severity="error"
              onClose={() => {
                setErrorMessage('')
              }}
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
                {users.length === 1
                  ? 'user'
                  : 'users'}{' '}
                found
              </Typography>

              <TableContainer
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflowX: 'auto',
                }}
              >
                <Table sx={{ minWidth: 1220 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Last login</TableCell>

                      <TableCell
                        align="center"
                        sx={{ minWidth: 150 }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
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
                              Try changing the search or
                              filter values.
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

                          <TableCell align="center">
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5,
                              }}
                            >
                              <Tooltip title="Edit user">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setSelectedEditUser(user)
                                  }}
                                >
                                  <EditOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip
                                title={
                                  user.is_active
                                    ? (
                                      'Send password ' +
                                      'setup/reset email'
                                    )
                                    : (
                                      'Activate this account ' +
                                      'before sending email'
                                    )
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    disabled={
                                      !user.is_active ||
                                      emailActionUserId !== null
                                    }
                                    onClick={() => {
                                      void handleSendPasswordEmail(
                                        user,
                                      )
                                    }}
                                  >
                                    {emailActionUserId ===
                                    user.id ? (
                                      <CircularProgress
                                        size={18}
                                      />
                                    ) : (
                                      <MailOutlined fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Tooltip title="Delete user">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedDeleteUser(user)
                                  }}
                                >
                                  <DeleteOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
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

      {selectedEditUser && (
        <AdminEditUserDialog
          open
          user={selectedEditUser}
          onClose={() => {
            setSelectedEditUser(null)
          }}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {selectedDeleteUser && (
        <AdminDeleteUserDialog
          open
          user={selectedDeleteUser}
          onClose={() => {
            setSelectedDeleteUser(null)
          }}
          onUserDeleted={handleUserDeleted}
        />
      )}
    </>
  )
}

export default AdminUserTable