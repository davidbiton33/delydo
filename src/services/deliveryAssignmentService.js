import { getDatabase, ref, get, update, query, orderByChild, equalTo } from 'firebase/database';

// Function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
};

// Function to get all available couriers
const getAvailableCouriers = async () => {
  const db = getDatabase();
  const couriersRef = ref(db, 'curiers');

  // First get all active couriers (status = true)
  const activeCouriersQuery = query(couriersRef, orderByChild('status'), equalTo(true));
  const snapshot = await get(activeCouriersQuery);

  if (!snapshot.exists()) {
    return [];
  }

  const couriers = [];

  // Filter to only include couriers that are also available (liveStatus = 'available')
  snapshot.forEach((childSnapshot) => {
    const courier = childSnapshot.val();

    // Only include couriers that are both active and available (or pending acceptance)
    // Couriers with pending_acceptance status can still receive new tasks
    if (courier.liveStatus === 'available' || courier.liveStatus === 'pending_acceptance') {
      couriers.push({
        id: childSnapshot.key,
        ...courier
      });
    }
  });

  return couriers;
};

// Function to get business location
const getBusinessLocation = async (businessId) => {
  const db = getDatabase();
  const businessRef = ref(db, `businesses/${businessId}`);

  const snapshot = await get(businessRef);
  if (!snapshot.exists()) {
    throw new Error(`Business with ID ${businessId} not found`);
  }

  const business = snapshot.val();
  return {
    latitude: business.businessLatitude,
    longitude: business.businessLongitude
  };
};

// Function to find the nearest courier
const findNearestCourier = (couriers, businessLat, businessLng) => {
  if (couriers.length === 0) return null;

  // Calculate distance for each courier
  const couriersWithDistance = couriers.map(courier => ({
    ...courier,
    distance: calculateDistance(
      businessLat,
      businessLng,
      courier.curierLatitude,
      courier.curierLongitude
    )
  }));

  // Sort by distance
  couriersWithDistance.sort((a, b) => a.distance - b.distance);

  return couriersWithDistance[0];
};

// Main function to assign a delivery task to the nearest courier
export const assignDeliveryToNearestCourier = async (taskId, broadcastToAll = false) => {
  const db = getDatabase();
  const taskRef = ref(db, `deliveryTasks/${taskId}`);

  // Get task details
  const taskSnapshot = await get(taskRef);
  if (!taskSnapshot.exists()) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  const task = taskSnapshot.val();

  // Skip if task is already accepted
  if (task.status === 'accepted' || task.status === 'picked' || task.status === 'delivered') {
    return null;
  }

  // Get business location
  const businessLocation = await getBusinessLocation(task.businessId);

  let targetCourierId = null;

  if (broadcastToAll) {
    // If broadcasting, just mark it as broadcast and let couriers claim it
    await update(taskRef, {
      status: 'broadcast',
      broadcastAt: new Date().toISOString(),
      assignmentAttempts: (task.assignmentAttempts || 0) + 1
    });
    // Task broadcast to all available couriers
    return 'broadcast';
  } else {
    // Get available couriers
    const availableCouriers = await getAvailableCouriers();

    // Find nearest courier
    const nearestCourier = findNearestCourier(
      availableCouriers,
      businessLocation.latitude,
      businessLocation.longitude
    );

    if (!nearestCourier) {
      // No available couriers found
      return null;
    }

    targetCourierId = nearestCourier.id;

    // Assign task to courier (pending acceptance)
    const now = new Date().toISOString();

    // Create statusTimestamps object if it doesn't exist
    let statusTimestamps = task.statusTimestamps || {};
    statusTimestamps = {
      ...statusTimestamps,
      pending_acceptance: now
    };

    await update(taskRef, {
      curierId: targetCourierId,
      status: 'pending_acceptance',
      assignedAt: now,
      statusTimestamps: statusTimestamps,
      assignmentAttempts: (task.assignmentAttempts || 0) + 1
    });

    // Update courier status to pending_acceptance
    const courierRef = ref(db, `curiers/${targetCourierId}`);
    await update(courierRef, {
      liveStatus: 'pending_acceptance'
    });

    // Task assigned to courier (pending acceptance)
  }

  return targetCourierId;
};

// Function to reassign a task if courier doesn't respond
export const reassignDeliveryTask = async (taskId) => {
  const db = getDatabase();
  const taskRef = ref(db, `deliveryTasks/${taskId}`);

  // Get task details
  const taskSnapshot = await get(taskRef);
  if (!taskSnapshot.exists()) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  const task = taskSnapshot.val();

  // If task is not in pending_acceptance status, don't reassign
  if (task.status !== 'pending_acceptance' && task.status !== 'pending') {
    return null;
  }

  // Get business location
  const businessLocation = await getBusinessLocation(task.businessId);

  // Get available couriers
  let availableCouriers = await getAvailableCouriers();

  // Remove the current courier from the list if there is one
  if (task.curierId) {
    availableCouriers = availableCouriers.filter(courier => courier.id !== task.curierId);
  }

  // Find nearest courier
  const nearestCourier = findNearestCourier(
    availableCouriers,
    businessLocation.latitude,
    businessLocation.longitude
  );

  if (!nearestCourier) {
    // No available couriers found for reassignment
    return null;
  }

  // Reassign task to new courier
  const now = new Date().toISOString();

  // Create statusTimestamps object if it doesn't exist
  let statusTimestamps = task.statusTimestamps || {};
  statusTimestamps = {
    ...statusTimestamps,
    pending_acceptance: now
  };

  await update(taskRef, {
    curierId: nearestCourier.id,
    status: 'pending_acceptance',
    assignedAt: now,
    statusTimestamps: statusTimestamps,
    assignmentAttempts: (task.assignmentAttempts || 1) + 1
  });

  // Update courier status to pending_acceptance
  const courierRef = ref(db, `curiers/${nearestCourier.id}`);
  await update(courierRef, {
    liveStatus: 'pending_acceptance'
  });

  // Task reassigned to courier
  return nearestCourier.id;
};
