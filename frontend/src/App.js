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
import ManagerSensors from './pages/manager/ManagerSensors'
import ManagerEnvironment from './pages/manager/ManagerEnvironment'

import StaffDashboard from './pages/staff/StaffDashboard'
import StaffExpenses from './pages/staff/StaffExpenses'
import StaffCultivationLogs from './pages/staff/StaffCultivationLogs'
import StaffEnvironment from './pages/staff/StaffEnvironment'
import StaffTasks from './pages/staff/StaffTasks'
import StaffDiseaseReport from './pages/staff/StaffDiseaseReport'
import StaffAssignedPonds from './pages/staff/StaffAssignedPonds'
import StaffFeedLogs from './pages/staff/StaffFeedLogs'

import './styles/global.css'

const DashboardLayout = ({ children }) => (
  <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
    <Sidebar />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  </div>
)

const ProtectedDashboardRoute = ({ children, requiredRoles = [] }) => (
  <ProtectedRoute requiredRoles={requiredRoles}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
)

const Unauthorized = () => (
  <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/profile"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF']}>
                <Profile />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedDashboardRoute requiredRoles={['ADMIN', 'MANAGER', 'STAFF']}>
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
            path="/manager/sensors"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerSensors />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/environment"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerEnvironment />
              </ProtectedDashboardRoute>
            }
          />

          <Route
            path="/staff/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffDashboard />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/ponds"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffAssignedPonds />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/cultivation-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffCultivationLogs />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/environment"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffEnvironment />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/feed-logs"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffFeedLogs />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/tasks"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffTasks />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/disease-report"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffDiseaseReport />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/staff/expenses"
            element={
              <ProtectedDashboardRoute requiredRoles={['STAFF']}>
                <StaffExpenses />
              </ProtectedDashboardRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
