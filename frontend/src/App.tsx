import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import EmployeeDirectory from './pages/EmployeeDirectory'
import AttendanceTracking from './pages/AttendanceTracking'
import RecruitmentPage from './pages/RecruitmentPage'
import PayrollPage from './pages/PayrollPage'
import PerformancePage from './pages/PerformancePage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import EmployeeProfile from './pages/EmployeeProfile'
import AccountPage from './pages/AccountPage'
import VendorsPage from './pages/VendorsPage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="employees" element={<EmployeeDirectory />} />
              <Route path="attendance" element={<AttendanceTracking />} />
              <Route path="recruitment" element={<RecruitmentPage />} />
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="employee/:id" element={<EmployeeProfile />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

