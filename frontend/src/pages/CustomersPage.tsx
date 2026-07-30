import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { AddRounded, SearchRounded } from '@mui/icons-material'

type CustomerStatus = 'ACTIVE' | 'INACTIVE'

type Customer = {
  id: number
  name: string
  company: string
  email: string
  phone: string
  accountManager: string
  status: CustomerStatus
  convertedAt: string
}

const initialCustomers: Customer[] = [
  {
    id: 1,
    name: 'Sahan Fernando',
    company: 'Orbit Technologies',
    email: 'sahan@orbit.lk',
    phone: '+94 77 123 4567',
    accountManager: 'Nuwan Perera',
    status: 'ACTIVE',
    convertedAt: '25 Jul 2026',
  },
  {
    id: 2,
    name: 'Nadeesha Perera',
    company: 'Bluewave Holdings',
    email: 'nadeesha@bluewave.lk',
    phone: '+94 71 456 7890',
    accountManager: 'Kasun Fernando',
    status: 'ACTIVE',
    convertedAt: '20 Jul 2026',
  },
  {
    id: 3,
    name: 'Ravindu Silva',
    company: 'Summit Digital',
    email: 'ravindu@summit.lk',
    phone: '+94 76 987 6543',
    accountManager: 'Nuwan Perera',
    status: 'INACTIVE',
    convertedAt: '14 Jul 2026',
  },
]

function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    CustomerStatus | 'ALL'
  >('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    accountManager: '',
  })

  const filteredCustomers = useMemo(() => {
    const query = search.toLowerCase().trim()

    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(query) ||
        customer.company.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'ALL' || customer.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [customers, search, statusFilter])

  const handleAddCustomer = () => {
    if (!form.name.trim() || !form.email.trim()) {
      return
    }

    const newCustomer: Customer = {
      id: Date.now(),
      name: form.name.trim(),
      company: form.company.trim() || 'Not provided',
      email: form.email.trim(),
      phone: form.phone.trim() || 'Not provided',
      accountManager: form.accountManager.trim() || 'Unassigned',
      status: 'ACTIVE',
      convertedAt: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }

    setCustomers((currentCustomers) => [
      newCustomer,
      ...currentCustomers,
    ])

    setForm({
      name: '',
      company: '',
      email: '',
      phone: '',
      accountManager: '',
    })

    setDialogOpen(false)
  }

  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Customers
          </Typography>

          <Typography sx={{ color: 'text.secondary' }}>
            View and manage converted Altrium customers.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => setDialogOpen(true)}
        >
          Add Customer
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, company or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
              },
            }}
          />

          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Status</InputLabel>

            <Select
              value={statusFilter}
              label="Status"
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as CustomerStatus | 'ALL',
                )
              }
            >
              <MenuItem value="ALL">All statuses</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Card>

      <TableContainer component={Card} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Account manager</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Converted</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>
                    {customer.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {customer.email}
                  </Typography>
                </TableCell>

                <TableCell>{customer.company}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>{customer.accountManager}</TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={customer.status}
                    color={
                      customer.status === 'ACTIVE'
                        ? 'success'
                        : 'default'
                    }
                  />
                </TableCell>

                <TableCell>{customer.convertedAt}</TableCell>
              </TableRow>
            ))}

            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    No customers found
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Try changing your search or status filter.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Customer</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              required
              label="Contact name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />

            <TextField
              label="Company"
              value={form.company}
              onChange={(event) =>
                setForm({ ...form, company: event.target.value })
              }
            />

            <TextField
              required
              type="email"
              label="Email address"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />

            <TextField
              label="Phone number"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />

            <TextField
              label="Account manager"
              value={form.accountManager}
              onChange={(event) =>
                setForm({
                  ...form,
                  accountManager: event.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleAddCustomer}
            disabled={!form.name.trim() || !form.email.trim()}
          >
            Save Customer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CustomersPage