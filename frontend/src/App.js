import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ToastProvider'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import Sidebar from './components/Sidebar'

import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'

// Admin UI removed

import OwnerCultivationLogs from './pages/owner/OwnerCultivationLogs'
import OwnerTasks from './pages/owner/OwnerTasks'

import WorkerDashboard from './pages/worker/WorkerDashboard'
import WorkerAssignedPonds from './pages/worker/WorkerAssignedPonds'
import WorkerCultivationLogs from './pages/worker/WorkerCultivationLogs'
import WorkerTasks from './pages/worker/WorkerTasks'

import TechnicianDashboard from './pages/technician/TechnicianDashboard'
import TechnicianEnvironment from './pages/technician/TechnicianEnvironment'
import TechnicianSensors from './pages/technician/TechnicianSensors'
import TechnicianPonds from './pages/technician/TechnicianPonds'
import TechnicianSeasons from './pages/technician/TechnicianSeasons'

import AccountantDashboard from './pages/accountant/AccountantDashboard'
import AccountantExpenses from './pages/accountant/AccountantExpenses'

import StorekeeperDashboard from './pages/storekeeper/StorekeeperDashboard'
import StorekeeperCategories from './pages/storekeeper/StorekeeperCategories'
import StorekeeperInventory from './pages/storekeeper/StorekeeperInventory'

import OwnerDashboard from './pages/owner/OwnerDashboard'
import OwnerPonds from './pages/owner/OwnerPonds'
import OwnerManageStaff from './pages/owner/OwnerManageStaff'
import OwnerSeasons from './pages/owner/OwnerSeasons'

import './styles/global.css'
import './styles/common.css'
import './styles/shared-table.css'
import './styles/shared-stats.css'

const DashboardLayout = ({ children }) => (
  <div className="app-shell">
    <Sidebar />
    <div className="app-shell_content">
      <Header />
      <main className="app-shell_main">{children}</main>
    </div>
  </div>
)

const ProtectedDashboardRoute = ({ children, requiredRoles = [] }) => (
  <ProtectedRoute requiredRoles={requiredRoles}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
)

const Unauthorized = () => (
  <div className="flex-center app-empty-state">
    <h1>🚫 Không có quyền truy cập</h1>
    <p>Bạn không có quyền truy cập trang này</p>
    <a href="/" className="btn btn-primary">
      Quay lại trang chủ
    </a>
  </div>
)

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <div>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/profile"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER', 'WORKER', 'TECHNICIAN', 'ACCOUNTANT', 'STOREKEEPER']}>
                <Profile />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER', 'WORKER', 'TECHNICIAN', 'ACCOUNTANT', 'STOREKEEPER']}>
                <ChangePassword />
              </ProtectedDashboardRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin routes removed */}

          <Route
            path="/owner/cultivation-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerCultivationLogs />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/owner/tasks"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerTasks />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/worker/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['WORKER']}>
                <WorkerDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/worker/ponds"
            element={
              <ProtectedDashboardRoute requiredRoles={['WORKER']}>
                <WorkerAssignedPonds />
              </ProtectedDashboardRoute>
            }
          />
          
          <Route
            path="/worker/cultivation-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['WORKER']}>
                <WorkerCultivationLogs />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/worker/tasks"
            element={
              <ProtectedDashboardRoute requiredRoles={['WORKER']}>
                <WorkerTasks />
              </ProtectedDashboardRoute>
            }
          />

          <Route
            path="/technician/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/technician/ponds"
            element={
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianPonds />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/technician/seasons"
            element={
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianSeasons />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/technician/environment"
            element={
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianEnvironment />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/technician/sensor"
            element={
              <Navigate to="/technician/sensors" replace />
            }
          />
          <Route
            path="/technician/sensors"
            element={
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianSensors />
              </ProtectedDashboardRoute>
            }
          />

          <Route
            path="/accountant/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['ACCOUNTANT']}>
                <AccountantDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/accountant/expenses"
            element={
              <ProtectedDashboardRoute requiredRoles={['ACCOUNTANT']}>
                <AccountantExpenses />
              </ProtectedDashboardRoute>
            }
          />

          <Route
            path="/storekeeper/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['STOREKEEPER']}>
                <StorekeeperDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/storekeeper/categories"
            element={
              <ProtectedDashboardRoute requiredRoles={['STOREKEEPER']}>
                <StorekeeperCategories />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/storekeeper/inventory"
            element={
              <ProtectedDashboardRoute requiredRoles={['STOREKEEPER']}>
                <StorekeeperInventory />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/owner/ponds"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerPonds />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/owner/seasons"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerSeasons />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/owner/users"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerManageStaff />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/owner/manage-staff"
            element={
              <ProtectedDashboardRoute requiredRoles={['OWNER']}>
                <OwnerManageStaff />
              </ProtectedDashboardRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        </AuthProvider>
      </ToastProvider>
    </Router>
  )
}

export default App
