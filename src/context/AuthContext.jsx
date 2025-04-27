import { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, loginWithEmail, logout } from '../services/authService';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userId, setUserId] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [deliveryCompanyId, setDeliveryCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login function
  const login = async (email, password) => {
    try {
      const result = await loginWithEmail(email, password);
      setCurrentUser(result.user);
      setUserType(result.type);
      setUserId(result.id);
      setDisplayName(result.displayName);
      setDeliveryCompanyId(result.deliveryCompanyId);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logoutUser = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setUserType(null);
      setUserId(null);
      setDisplayName(null);
      setDeliveryCompanyId(null);
    } catch (error) {
      throw error;
    }
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const result = await getCurrentUser();
        if (result) {
          setCurrentUser(result.user);
          setUserType(result.type);
          setUserId(result.id);
          setDisplayName(result.displayName);
          setDeliveryCompanyId(result.deliveryCompanyId);
        }
      } catch (error) {
        console.error("Auth state check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Context value
  const value = {
    currentUser,
    userType,
    userId,
    displayName,
    deliveryCompanyId,
    login,
    logout: logoutUser,
    isAuthenticated: !!currentUser,
    isBusiness: userType === 'business',
    isCourier: userType === 'courier',
    isAdmin: userType === 'admin',
    isSuperAdmin: userType === 'superAdmin' || localStorage.getItem('userType') === 'superAdmin',
    isCompanyOwner: userType === 'admin',
    // Helper function to check if user has access to a specific company's data
    hasCompanyAccess: (companyId) => {
      // Super admin has access to all companies
      if (userType === 'superAdmin' || localStorage.getItem('userType') === 'superAdmin') return true;
      // Company owner has access only to their company
      return deliveryCompanyId === companyId;
    },
    // Helper function to check if user has access to a specific business's data
    hasBusinessAccess: (businessCompanyId) => {
      // Super admin has access to all businesses
      if (userType === 'superAdmin') return true;
      // Company owner has access to businesses in their company
      if (userType === 'admin') return deliveryCompanyId === businessCompanyId;
      // Business has access only to itself
      return userType === 'business' && userId === businessCompanyId;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
