import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/protected-route.css';

export const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="protected-route_loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
