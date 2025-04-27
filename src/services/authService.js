import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getDatabase, ref, get, set } from 'firebase/database';
import { auth } from '../firebase';

// Function to determine user type and get associated ID and company
export const getUserType = async (uid) => {
  try {
    // Getting user type for UID

    // Special case for davidbiton2@gmail.com (Super Admin)
    if (uid === 'vyt5VwSWEohps8OgC0E7Ar4BHHu1') {
      // Create or update the user in the database
      const db = getDatabase();
      const userRef = ref(db, `users/${uid}`);
      await set(userRef, {
        displayName: 'דוד ביטון',
        email: 'davidbiton2@gmail.com',
        roles: {
          superAdmin: true
        }
      });

      const result = {
        type: 'superAdmin',
        id: uid,
        displayName: 'דוד ביטון',
        deliveryCompanyId: null
      };
      return result;
    }

    const db = getDatabase();

    // Get user data from users collection
    const userRef = ref(db, `users/${uid}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      console.log('User not found in database');
      return { type: 'unknown', id: null };
    }

    const userData = userSnapshot.val();
    // User data found

    // Initialize delivery company ID as null
    let deliveryCompanyId = null;

    // Check user roles
    if (userData.roles) {
      // Check if user is a business
      if (userData.roles.business) {
        // Find the business ID associated with this user
        const businessRef = ref(db, 'businesses');
        const businessSnapshot = await get(businessRef);

        if (businessSnapshot.exists()) {
          const businesses = businessSnapshot.val();
          for (const businessId in businesses) {
            // Match by email since we don't have direct userId reference
            if (businesses[businessId].email === userData.email) {
              // Try to find the delivery company for this business
              const businessCompanyId = await findDeliveryCompanyForBusiness(businessId);
              return {
                type: 'business',
                id: businessId,
                displayName: userData.displayName,
                deliveryCompanyId: businessCompanyId
              };
            }
          }
        }

        // If we have the role but no matching business record yet
        return {
          type: 'business',
          id: null,
          displayName: userData.displayName,
          deliveryCompanyId
        };
      }

      // Check if user is a courier
      if (userData.roles.courier) {
        // Find the courier ID associated with this user
        const courierRef = ref(db, 'curiers');
        const courierSnapshot = await get(courierRef);

        if (courierSnapshot.exists()) {
          const couriers = courierSnapshot.val();
          for (const courierId in couriers) {
            // Try to match by user ID first (if courier ID is the same as user ID)
            if (courierId === uid) {
              // Try to find the delivery company for this courier
              const courierCompanyId = await findDeliveryCompanyForCourier(courierId);
              return {
                type: 'courier',
                id: courierId,
                displayName: userData.displayName,
                deliveryCompanyId: courierCompanyId
              };
            }
            // Then try to match by name
            else if (couriers[courierId].curierName === userData.displayName) {
              // Try to find the delivery company for this courier
              const courierCompanyId = await findDeliveryCompanyForCourier(courierId);
              return {
                type: 'courier',
                id: courierId,
                displayName: userData.displayName,
                deliveryCompanyId: courierCompanyId
              };
            }
          }
        }

        // If we have the role but no matching courier record yet
        return {
          type: 'courier',
          id: null,
          displayName: userData.displayName,
          deliveryCompanyId
        };
      }

      // Check if user is a superAdmin
      if (userData.roles.superAdmin) {
        // Found superAdmin role for user
        return {
          type: 'superAdmin',
          id: uid,
          displayName: userData.displayName,
          // Super admin doesn't need a company ID as they can access everything
          deliveryCompanyId: null
        };
      }

      // Check if user is an admin (delivery company owner)
      if (userData.roles.admin) {
        // For admin users, check if their user ID matches a delivery company ID
        const companyId = await findDeliveryCompanyForAdmin(uid);
        return {
          type: 'admin',
          id: uid,
          displayName: userData.displayName,
          deliveryCompanyId: companyId || uid // If no match found, use the user ID as company ID
        };
      }
    }
  } catch (error) {
    console.error("Error determining user type:", error);
    throw error;
  }

  // If no specific role found
  return { type: 'unknown', id: null, displayName: '' };
};

// Helper function to find delivery company for a business
async function findDeliveryCompanyForBusiness(businessId) {
  try {
    const db = getDatabase();

    // First check if the business has a deliveryCompanyId field
    const businessRef = ref(db, `businesses/${businessId}`);
    const businessSnapshot = await get(businessRef);

    if (businessSnapshot.exists()) {
      const businessData = businessSnapshot.val();
      if (businessData.deliveryCompanyId) {
        return businessData.deliveryCompanyId;
      }
    }

    // If not, check delivery tasks for this business to find a company
    const tasksRef = ref(db, 'deliveryTasks');
    const tasksSnapshot = await get(tasksRef);

    if (tasksSnapshot.exists()) {
      const tasks = tasksSnapshot.val();
      for (const taskId in tasks) {
        const task = tasks[taskId];
        if (task.businessId === businessId && task.deliveryCompanyId) {
          return task.deliveryCompanyId;
        }
      }
    }

    // Default company ID if nothing found
    return 'OMBhosmM56uw6uweuqpydd';
  } catch {
    // Error finding delivery company for business
    return null;
  }
}

// Helper function to find delivery company for a courier
async function findDeliveryCompanyForCourier(courierId) {
  try {
    const db = getDatabase();

    // First check if the courier has a deliveryCompanyId field
    const courierRef = ref(db, `curiers/${courierId}`);
    const courierSnapshot = await get(courierRef);

    if (courierSnapshot.exists()) {
      const courierData = courierSnapshot.val();
      if (courierData.deliveryCompanyId) {
        return courierData.deliveryCompanyId;
      }
    }

    // If not, check delivery tasks for this courier to find a company
    const tasksRef = ref(db, 'deliveryTasks');
    const tasksSnapshot = await get(tasksRef);

    if (tasksSnapshot.exists()) {
      const tasks = tasksSnapshot.val();
      for (const taskId in tasks) {
        const task = tasks[taskId];
        if (task.curierId === courierId && task.deliveryCompanyId) {
          return task.deliveryCompanyId;
        }
      }
    }

    // Default company ID if nothing found
    return 'OMBhosmM56uw6uweuqpydd';
  } catch {
    // Error finding delivery company for courier
    return null;
  }
}

// Helper function to find delivery company for an admin
async function findDeliveryCompanyForAdmin(adminId) {
  try {
    const db = getDatabase();

    // Check if the admin ID is a delivery company ID
    const companiesRef = ref(db, 'deliveryCompanies');
    const companiesSnapshot = await get(companiesRef);

    if (companiesSnapshot.exists()) {
      const companies = companiesSnapshot.val();

      // First check: if admin ID is directly a company ID
      if (companies[adminId]) {
        // Admin is directly a company owner
        return adminId; // The admin ID is the company ID
      }

      // Second check: for user Yi8oZwBPvAZO8yXoe01DWHwzm5A3 (זיו הגבר) - hardcoded match to company OMBhosmM56uw6uweuqpydd
      if (adminId === 'Yi8oZwBPvAZO8yXoe01DWHwzm5A3') {
        // Special case for זיו הגבר
        return 'OMBhosmM56uw6uweuqpydd';
      }

      // If we have companies, return the first one as default
      const firstCompanyId = Object.keys(companies)[0];
      if (firstCompanyId) {
        // Defaulting to first company
        return firstCompanyId;
      }
    }

    // Default to a known company ID if we can't find a match
    // Defaulting to hardcoded company
    return 'OMBhosmM56uw6uweuqpydd';
  } catch {
    // Error finding delivery company for admin
    return 'OMBhosmM56uw6uweuqpydd'; // Return default even on error
  }
}

// Login with email and password
export const loginWithEmail = async (email, password) => {
  // Special case for davidbiton2@gmail.com (Super Admin)
  if (email === 'davidbiton2@gmail.com') {
    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Hardcoded superAdmin info
    const userTypeInfo = {
      type: 'superAdmin',
      id: user.uid,
      displayName: 'דוד ביטון',
      deliveryCompanyId: null
    };

    // Store user info in localStorage for persistence
    localStorage.setItem('userType', 'superAdmin');
    localStorage.setItem('displayName', 'דוד ביטון');

    return userTypeInfo;
  }

  // Normal login flow for other users
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Determine user type and associated ID
  const userTypeInfo = await getUserType(user.uid);
  // User type info determined

  // Store user info in localStorage for persistence
  localStorage.setItem('userType', userTypeInfo.type);
  localStorage.setItem('displayName', userTypeInfo.displayName || '');

  // Store delivery company ID if available
  if (userTypeInfo.deliveryCompanyId) {
    localStorage.setItem('deliveryCompanyId', userTypeInfo.deliveryCompanyId);
  } else {
    // No delivery company ID to store
  }

  if (userTypeInfo.id) {
    if (userTypeInfo.type === 'business') {
      localStorage.setItem('businessId', userTypeInfo.id);
    } else if (userTypeInfo.type === 'courier') {
      localStorage.setItem('courierId', userTypeInfo.id);
    }
  }

  return { user, ...userTypeInfo };
};

// Logout
export const logout = async () => {
  await signOut(auth);
  // Clear localStorage
  localStorage.removeItem('userType');
  localStorage.removeItem('businessId');
  localStorage.removeItem('courierId');
  localStorage.removeItem('deliveryCompanyId');
};

// Get current authenticated user
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          // Special case for davidbiton2@gmail.com (Super Admin)
          if (user.email === 'davidbiton2@gmail.com') {
            // Special case for superAdmin user

            // Create or update the user in the database
            const db = getDatabase();
            const userRef = ref(db, `users/${user.uid}`);
            await set(userRef, {
              displayName: 'דוד ביטון',
              email: 'davidbiton2@gmail.com',
              roles: {
                superAdmin: true
              }
            });

            const result = {
              user,
              type: 'superAdmin',
              id: user.uid,
              displayName: 'דוד ביטון',
              deliveryCompanyId: null
            };

            // SuperAdmin result ready
            resolve(result);
            return;
          }

          // Normal flow for other users
          const userTypeInfo = await getUserType(user.uid);
          // User type info retrieved

          // If we have a stored ID but didn't find one in the database, use the stored one
          if (!userTypeInfo.id) {
            if (userTypeInfo.type === 'business') {
              userTypeInfo.id = localStorage.getItem('businessId');
              // Using businessId from localStorage
            } else if (userTypeInfo.type === 'courier') {
              userTypeInfo.id = localStorage.getItem('courierId');
              // Using courierId from localStorage
            }
          }

          // If we don't have a delivery company ID, try to get it from localStorage
          if (!userTypeInfo.deliveryCompanyId) {
            userTypeInfo.deliveryCompanyId = localStorage.getItem('deliveryCompanyId');
            // Using deliveryCompanyId from localStorage
          }

          resolve({ user, ...userTypeInfo });
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(null);
      }
    }, reject);
  });
};

// Register a new user (for future use)
export const registerUser = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'הוראות לאיפוס סיסמה נשלחו לדוא"ל שלך' };
  } catch (error) {
    // Password reset error occurred
    let errorMessage = 'אירעה שגיאה בשליחת הוראות איפוס הסיסמה';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'לא נמצא משתמש עם כתובת דוא"ל זו';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'כתובת דוא"ל לא תקינה';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'יותר מדי בקשות. נסה שוב מאוחר יותר';
    }

    throw { code: error.code, message: errorMessage };
  }
};
