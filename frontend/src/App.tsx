import { Navigate, Route, Routes } from 'react-router'

import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import AppShell from './layouts/AppShell'
import AdminPage from './pages/AdminPage'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LeadWorkspacePage from './pages/LeadWorkspacePage'
import LeadsPage from './pages/LeadsPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/leads"
            element={<LeadsPage />}
          />

          <Route
            path="/leads/:leadId"
            element={<LeadWorkspacePage />}
          />

          <Route
            path="/customers"
            element={<CustomersPage />}
          />

          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={['ADMIN']}
              />
            }
          >
            <Route
              path="/admin"
              element={<AdminPage />}
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App