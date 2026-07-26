import { Route, Routes } from 'react-router'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import AppShell from './layouts/AppShell'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import LoginPage from './pages/LoginPage'
import CustomersPage from './pages/CustomersPage'

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App