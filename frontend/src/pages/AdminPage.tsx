import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material'
import { AdminPanelSettingsOutlined } from '@mui/icons-material'

function AdminPage() {
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Administration
      </Typography>

      <Typography sx={{ color: 'text.secondary', mb: 4 }}>
        Manage ELEVEN CRM users, roles and permissions.
      </Typography>

      <Card variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <AdminPanelSettingsOutlined
            color="primary"
            sx={{ fontSize: 42, mb: 2 }}
          />

          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Administrator access
          </Typography>

          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            User-management tools will be added here in a future feature.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AdminPage