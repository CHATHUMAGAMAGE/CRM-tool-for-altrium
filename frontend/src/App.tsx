import {
  useEffect,
  useState,
} from 'react'

import {
  Box,
  CircularProgress,
} from '@mui/material'

import {
  Navigate,
  Route,
  Routes,
} from 'react-router'

import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import AppShell from './layouts/AppShell'

import ActivityPage from './pages/ActivityPage'
import AdminPage from './pages/AdminPage'
import CustomersPage from './pages/CustomersPage'
import DashboardPage from './pages/DashboardPage'
import FinancialAssessmentsPage from './pages/FinancialAssessmentsPage'
import FinancialAssessmentWorkspacePage from './pages/FinancialAssessmentWorkspacePage'
import FollowUpDetailPage from './pages/FollowUpDetailPage'
import FollowUpsPage from './pages/FollowUpsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LeadWorkspacePage from './pages/LeadWorkspacePage'
import LeadsPage from './pages/LeadsPage'
import LoginPage from './pages/LoginPage'
import OpportunityReviewPage from './pages/OpportunityReviewPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TechnicalAssessmentsPage from './pages/TechnicalAssessmentsPage'
import TechnicalAssessmentWorkspacePage from './pages/TechnicalAssessmentWorkspacePage'

import {
  getCurrentUser,
} from './services/auth'


function DashboardEntry() {
  const [
    currentRole,
    setCurrentRole,
  ] =
    useState<
      string | null
    >(
      null,
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    )


  useEffect(
    () => {
      let mounted =
        true

      const load =
        async () => {
          try {
            const user =
              await getCurrentUser()

            if (
              mounted
            ) {
              setCurrentRole(
                user.role,
              )
            }
          } catch {
            if (
              mounted
            ) {
              setCurrentRole(
                null,
              )
            }
          } finally {
            if (
              mounted
            ) {
              setIsLoading(
                false,
              )
            }
          }
        }

      void load()

      return () => {
        mounted =
          false
      }
    },
    [],
  )


  if (
    isLoading
  ) {
    return (
      <Box
        sx={{
          minHeight:
            400,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <CircularProgress
          size={
            30
          }
        />
      </Box>
    )
  }


  if (
    currentRole ===
    'TECH_LEAD'
  ) {
    return (
      <TechnicalAssessmentsPage
        dashboardMode
      />
    )
  }


  if (
    currentRole ===
    'FINANCIAL_OFFICER'
  ) {
    return (
      <FinancialAssessmentsPage
        dashboardMode
      />
    )
  }


  return (
    <DashboardPage />
  )
}


function App() {
  return (
    <Routes>
      <Route
        element={
          <PublicOnlyRoute />
        }
      >
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
          element={
            <LoginPage />
          }
        />

        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordPage />
          }
        />

        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage />
          }
        />
      </Route>


      <Route
        element={
          <ProtectedRoute />
        }
      >
        <Route
          element={
            <AppShell />
          }
        >
          <Route
            path="/dashboard"
            element={
              <DashboardEntry />
            }
          />

          <Route
            path="/leads"
            element={
              <LeadsPage />
            }
          />

          <Route
            path="/leads/:leadId"
            element={
              <LeadWorkspacePage />
            }
          />

          <Route
            path="/follow-ups"
            element={
              <FollowUpsPage />
            }
          />

          <Route
            path="/follow-ups/:followUpId"
            element={
              <FollowUpDetailPage />
            }
          />

          <Route
            path="/activity"
            element={
              <ActivityPage />
            }
          />

          <Route
            path="/customers"
            element={
              <CustomersPage />
            }
          />

          <Route
            path="/technical-assessments"
            element={
              <TechnicalAssessmentsPage />
            }
          />

          <Route
            path="/technical-assessments/:assessmentId"
            element={
              <TechnicalAssessmentWorkspacePage />
            }
          />

          <Route
            path="/financial-assessments"
            element={
              <FinancialAssessmentsPage />
            }
          />

          <Route
            path="/financial-assessments/:assessmentId"
            element={
              <FinancialAssessmentWorkspacePage />
            }
          />


          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={[
                  'ADMIN',
                  'SALES_MANAGER',
                ]}
              />
            }
          >
            <Route
              path="/opportunity-review"
              element={
                <OpportunityReviewPage />
              }
            />
          </Route>


          <Route
            element={
              <RoleProtectedRoute
                allowedRoles={[
                  'ADMIN',
                ]}
              />
            }
          >
            <Route
              path="/admin"
              element={
                <AdminPage />
              }
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}


export default App