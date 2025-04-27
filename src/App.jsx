import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import BusinessDashboard from './components/pages/BusinessDashboard'
import CourierDashboard from './components/pages/CourierDashboard'
import AdminDashboard from './components/pages/AdminDashboard'
import SuperAdminDashboard from './components/pages/SuperAdminDashboard'
import Login from './components/pages/Login'
import ProtectedRoute from './components/routing/ProtectedRoute'
import SideMenu from './components/sections/SideMenu'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useEffect } from 'react';
import { monitorPendingTasks, monitorCourierAvailability } from './services';

// Redirect component for automatic navigation based on user type
function AutoRedirect() {
  const { isAuthenticated, isBusiness, isCourier, isSuperAdmin, isCompanyOwner } = useAuth();

  // Check if user is superAdmin from localStorage
  const userType = localStorage.getItem('userType');
  
  // Get last active tab from localStorage
  const lastSuperAdminTab = localStorage.getItem('lastSuperAdminTab') || 'dashboard';

  // If authenticated, redirect to the appropriate dashboard
  if (isAuthenticated) {
    // Special case for superAdmin
    if (userType === 'superAdmin' || isSuperAdmin) {
      return <Navigate to={`/superadmin?tab=${lastSuperAdminTab}`} replace />;
    } else if (isBusiness) {
      return <Navigate to="/business" replace />;
    } else if (isCourier) {
      return <Navigate to="/courier" replace />;
    } else if (isCompanyOwner) {
      return <Navigate to="/admin" replace />;
    }
  }

  // If not authenticated, redirect to login page
  return <Navigate to="/login" replace />;
}

// Main App component
function AppContent() {
  const { isAuthenticated, deliveryCompanyId } = useAuth();

  useEffect(() => {
    // Only start monitoring services if authenticated
    if (isAuthenticated) {
      monitorPendingTasks();
      monitorCourierAvailability();
    }
  }, [isAuthenticated]);

  return (
    <div className="app-container">
      {/* Side Menu */}
      <SideMenu />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/business" element={
          <ProtectedRoute requiredType="business" requiredCompanyId={deliveryCompanyId}>
            <BusinessDashboard />
          </ProtectedRoute>
        } />
        <Route path="/business/settings" element={
          <Navigate to="/business?tab=settings" replace />
        } />
        <Route path="/courier" element={
          <ProtectedRoute requiredType="courier" requiredCompanyId={deliveryCompanyId}>
            <CourierDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requiredType="admin" requiredCompanyId={deliveryCompanyId}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/superadmin" element={
          <ProtectedRoute requiredType="superAdmin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/redirect" element={<AutoRedirect />} />
        <Route path="/" element={<AutoRedirect />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
