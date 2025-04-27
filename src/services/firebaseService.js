import { getDatabase, ref, get, query, orderByChild, equalTo } from 'firebase/database';

// Firebase data fetching utilities
export const fetchBusinessById = async (businessId) => {
  try {
    const db = getDatabase();
    const businessRef = ref(db, `businesses/${businessId}`);
    const snapshot = await get(businessRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.key, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching business:", error);
    throw error;
  }
};

export const fetchCourierById = async (courierId) => {
  try {
    const db = getDatabase();
    const courierRef = ref(db, `curiers/${courierId}`);
    const snapshot = await get(courierRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.key, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching courier:", error);
    throw error;
  }
};

export const fetchTasksByBusinessId = async (businessId) => {
  try {
    const db = getDatabase();
    const tasksRef = ref(db, 'deliveryTasks');
    const businessTasksQuery = query(tasksRef, orderByChild('businessId'), equalTo(businessId));
    const snapshot = await get(businessTasksQuery);
    
    const tasks = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        tasks.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    return tasks;
  } catch (error) {
    console.error("Error fetching business tasks:", error);
    throw error;
  }
};

export const fetchTasksByCourierId = async (courierId) => {
  try {
    const db = getDatabase();
    const tasksRef = ref(db, 'deliveryTasks');
    const courierTasksQuery = query(tasksRef, orderByChild('curierId'), equalTo(courierId));
    const snapshot = await get(courierTasksQuery);
    
    const tasks = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        tasks.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    return tasks;
  } catch (error) {
    console.error("Error fetching courier tasks:", error);
    throw error;
  }
};
