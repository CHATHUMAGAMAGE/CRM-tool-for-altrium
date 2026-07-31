import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material'
import {
  GroupOutlined,
  PersonAddOutlined,
  TrendingUp,
} from '@mui/icons-material'

const summaryCards = [
  {
    title: 'Total Leads',
    value: '0',
    icon: <GroupOutlined color="primary" />,
  },
  {
    title: 'Assigned Leads',
    value: '0',
    icon: <PersonAddOutlined color="primary" />,
  },
  {
    title: 'Converted Customers',
    value: '0',
    icon: <TrendingUp color="primary" />,
  },
]

function DashboardPage() {
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Dashboard
      </Typography>

      <Typography sx={{ color: 'text.secondary', mb: 4 }}>
        ELEVEN CRM operational overview
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {summaryCards.map((card) => (
          <Card key={card.title} variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                    }}
                  >
                    {card.title}
                  </Typography>

                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    {card.value}
                  </Typography>
                </Box>

                {card.icon}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card variant="outlined" sx={{ mt: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Recent Leads
          </Typography>

          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Lead information will appear here after the CRM API is connected.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default DashboardPage