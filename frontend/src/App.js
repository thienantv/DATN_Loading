import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import Sidebar from './components/Sidebar'

import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminAI from './pages/admin/AdminAI'
import AdminUserLoginHistory from './pages/admin/AdminUserLoginHistory'

import ManagerPonds from './pages/manager/ManagerPonds'
import ManagerDashboard from './pages/manager/ManagerDashboard'
import ManagerSeasons from './pages/manager/ManagerSeasons'
import ManagerFeedLogs from './pages/manager/ManagerFeedLogs'
import ManagerCultivationLogs from './pages/manager/ManagerCultivationLogs'
import ManagerTasks from './pages/manager/ManagerTasks'

import WorkerDashboard from './pages/worker/WorkerDashboard'
import WorkerAssignedPonds from './pages/worker/WorkerAssignedPonds'
import WorkerFeedLogs from './pages/worker/WorkerFeedLogs'
import WorkerCultivationLogs from './pages/worker/WorkerCultivationLogs'
import WorkerTasks from './pages/worker/WorkerTasks'

import TechnicianDashboard from './pages/technician/TechnicianDashboard'
import TechnicianEnvironment from './pages/technician/TechnicianEnvironment'
import TechnicianSensor from './pages/technician/TechnicianSensor'
import TechnicianSensors from './pages/technician/TechnicianSensors'
import TechnicianThresholds from './pages/technician/TechnicianThresholds'

import AccountantDashboard from './pages/accountant/AccountantDashboard'
import AccountantExpenses from './pages/accountant/AccountantExpenses'

import StorekeeperDashboard from './pages/storekeeper/StorekeeperDashboard'
import StorekeeperCategories from './pages/storekeeper/StorekeeperCategories'
import StorekeeperInventory from './pages/storekeeper/StorekeeperInventory'
import StorekeeperImports from './pages/storekeeper/StorekeeperImports'
import StorekeeperExports from './pages/storekeeper/StorekeeperExports'
import StorekeeperAlerts from './pages/storekeeper/StorekeeperAlerts'

import OwnerDashboard from './pages/owner/OwnerDashboard'
import OwnerPonds from './pages/owner/OwnerPonds'
import OwnerManageStaff from './pages/owner/OwnerManageStaff'

import './styles/global.css'

const DashboardLayout = ({ children }) => (
  <div className="app-shell">
    <Sidebar />
    <div className="app-shell__content">
      <Header />
      <main className="app-shell__main">{children}</main>
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
      <AuthProvider>
        <div>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/profile"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN', 'OWNER', 'MANAGER', 'WORKER', 'TECHNICIAN', 'ACCOUNTANT', 'STOREKEEPER']}>
                <Profile />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN', 'OWNER', 'MANAGER', 'WORKER', 'TECHNICIAN', 'ACCOUNTANT', 'STOREKEEPER']}>
                <ChangePassword />
              </ProtectedDashboardRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN']}>
                <AdminUsers />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/admin/activity-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN']}>
                <AdminAuditLog />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/admin/user-login-history"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN']}>
                <AdminUserLoginHistory />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/admin/ai"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN']}>
                <AdminAI />
              </ProtectedDashboardRoute>
            }
          />

          <Route
            path="/manager/ponds"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerPonds />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/seasons"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerSeasons />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/feed-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerFeedLogs />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/cultivation-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerCultivationLogs />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/tasks"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerTasks />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/technician/thresholds"
            element={
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianThresholds />
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
            path="/worker/feed-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['WORKER']}>
                <WorkerFeedLogs />
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
              <ProtectedDashboardRoute requiredRoles={['TECHNICIAN']}>
                <TechnicianSensor />
              </ProtectedDashboardRoute>
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
            path="/storekeeper/imports"
            element={
              <ProtectedDashboardRoute requiredRoles={['STOREKEEPER']}>
                <StorekeeperImports />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/storekeeper/exports"
            element={
              <ProtectedDashboardRoute requiredRoles={['STOREKEEPER']}>
                <StorekeeperExports />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/storekeeper/alerts"
            element={
              <ProtectedDashboardRoute requiredRoles={['STOREKEEPER']}>
                <StorekeeperAlerts />
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
    </Router>
  )
}

export default App
