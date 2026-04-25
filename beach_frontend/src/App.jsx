import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import WorkersPage from './pages/WorkersPage'
import PayrollPage from './pages/PayrollPage'
import PayPeriodDetailPage from './pages/PayPeriodDetailPage'
import RosterPage from './pages/RosterPage'
import ShedsPage from './pages/ShedsPage'
import ShedsBookingPage from './pages/ShedsBookingPage'

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes — no login required */}
      <Route path="/book" element={<ShedsBookingPage />} />

      {/* Internal app */}
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workers"   element={<WorkersPage />} />
        <Route path="payroll"   element={<PayrollPage />} />
        <Route path="payroll/:id" element={<PayPeriodDetailPage />} />
        <Route path="roster"    element={<RosterPage />} />
        <Route path="sheds"     element={<ShedsPage />} />
      </Route>
    </Routes>
  )
}
