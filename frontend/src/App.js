import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminAI from './pages/admin/AdminAI';
import AdminUserLoginHistory from './pages/admin/AdminUserLoginHistory';

// Manager Category Pages
import ManagerPonds from './pages/manager/ManagerPonds';
import ManagerProducts from './pages/manager/ManagerProducts';
import ManagerDiseases from './pages/manager/ManagerDiseases';
import ManagerSensors from './pages/manager/ManagerSensors';

// Manager Pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerSeasons from './pages/manager/ManagerSeasons';
import ManagerCultivationLogs from './pages/manager/ManagerCultivationLogs';
import ManagerTasks from './pages/manager/ManagerTasks';
import ManagerEnvironment from './pages/manager/ManagerEnvironment';
import ManagerExpenses from './pages/manager/ManagerExpenses';
import ManagerReports from './pages/manager/ManagerReports';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffExpenses from './pages/staff/StaffExpenses';
import StaffCultivationLogs from './pages/staff/StaffCultivationLogs';
import StaffEnvironment from './pages/staff/StaffEnvironment';
import StaffTasks from './pages/staff/StaffTasks';
import StaffDiseaseReport from './pages/staff/StaffDiseaseReport';
import StaffAssignedPonds from './pages/staff/StaffAssignedPonds';
import StaffFeedLogs from './pages/staff/StaffFeedLogs';

// Styles
import './styles/global.css';

// Layout wrapper for dashboard pages
const DashboardLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  );
};

// Route component that checks authentication and role
const ProtectedDashboardRoute = ({ children, requiredRoles = [] }) => {
  return (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
};

const Unauthorized = () => {
  return (
    <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
      <h1>🚫 Không có quyền truy cập</h1>
      <p>Bạn không có quyền truy cập trang này</p>
      <a href="/" className="btn btn-primary">
        Quay lại trang chủ
      </a>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* User Routes (Protected) */}
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

          {/* Home - Redirect đến login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Routes */}
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

          {/* Manager Routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerDashboard />
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
            path="/manager/products"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerProducts />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/diseases"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerDiseases />
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
            path="/manager/seasons"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerSeasons />
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
            path="/manager/environment"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerEnvironment />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/expenses"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerExpenses />
              </ProtectedDashboardRoute>
            }
          />
          <Route
            path="/manager/reports"
            element={
              <ProtectedDashboardRoute requiredRoles={['MANAGER']}>
                <ManagerReports />
              </ProtectedDashboardRoute>
            }
          />

          {/* Staff Routes */}
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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
