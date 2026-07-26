import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  FilterListRounded,
} from '@mui/icons-material'

function CustomersPage() {
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

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FilterListRounded />}
          >
            Filters
          </Button>

          <Button
            variant="contained"
            startIcon={<AddRounded />}
          >
            Add Customer
          </Button>
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Customer records
          </Typography>

          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Customer information will appear here after the CRM API is
            completed.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default CustomersPage