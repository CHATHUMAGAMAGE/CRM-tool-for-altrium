import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { AddRounded, FilterListRounded } from '@mui/icons-material'

function LeadsPage() {
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
            Leads
          </Typography>

          <Typography sx={{ color: 'text.secondary' }}>
            Manage and track Altrium’s potential customers.
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
            Add Lead
          </Button>
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Lead records
          </Typography>

          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Lead data will appear here after the CRM API is completed.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LeadsPage