import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Protected route component that redirects to login if not authenticated
function ProtectedRoute({ children, requiredType, requiredCompanyId }) {
  const {
    isAuthenticated,
    userType,
    isSuperAdmin,
    isCompanyOwner,
    hasCompanyAccess,
    deliveryCompanyId
  } = useAuth();

  // Check if user is superAdmin from localStorage
  const localUserType = localStorage.getItem('userType');

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check exact access permissions - users can only access their own dashboard type
  if (requiredType) {
    // If user type doesn't match required type
    if (userType !== requiredType) {
      // Redirect to appropriate dashboard based on user type
      if (userType === 'business') {
        return <Navigate to="/business" replace />;
      } else if (userType === 'courier') {
        return <Navigate to="/courier" replace />;
      } else if (userType === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (userType === 'superAdmin') {
        return <Navigate to="/superadmin" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }
  }

  // If authenticated and has correct permissions, render the children
  return children;
}

export default ProtectedRoute;
