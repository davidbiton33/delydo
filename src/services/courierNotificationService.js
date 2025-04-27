import { getDatabase, ref, get, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { reassignDeliveryTask, assignDeliveryToNearestCourier } from './deliveryAssignmentService';

// In a real app, this would be connected to a real notification system
// For now, we'll simulate notifications with console logs and timeouts

// Track notification timeouts
const notificationTimeouts = {};

// Function to send notification to a courier
export const notifyCourier = (courierId, taskId) => {
  // Set a timeout for courier response (2 minutes)
  notificationTimeouts[taskId] = setTimeout(() => {
    handleCourierNoResponse(taskId);
  }, 2 * 60 * 1000); // 2 minutes
};

// Add a new function to check for expired tasks
export const checkExpiredTasks = async () => {
  const db = getDatabase();
  const tasksRef = ref(db, 'deliveryTasks');
  const pendingTasksQuery = query(tasksRef, orderByChild('status'), equalTo('pending_acceptance'));

  const snapshot = await get(pendingTasksQuery);
  if (!snapshot.exists()) return;

  const now = new Date();

  snapshot.forEach((childSnapshot) => {
    const taskId = childSnapshot.key;
    const task = childSnapshot.val();

    // Skip if no assignedAt timestamp
    if (!task.assignedAt) return;

    const assignedTime = new Date(task.assignedAt);
    const timeDiff = now - assignedTime;

    // If task has been pending for more than 2 minutes
    if (timeDiff > 2 * 60 * 1000) {
      // Task expired
      handleCourierNoResponse(taskId);
    }
  });
};

// Function to handle when a courier doesn't respond
const handleCourierNoResponse = async (taskId) => {
  // Courier did not respond to task within time limit

  // Check current task status
  const db = getDatabase();
  const taskRef = ref(db, `deliveryTasks/${taskId}`);
  const snapshot = await get(taskRef);

  if (snapshot.exists()) {
    const task = snapshot.val();

    // Only reassign if still in pending_acceptance status
    if (task.status === 'pending_acceptance') {
      // Reassigning task

      // Update courier status back to available
      if (task.curierId) {
        const courierRef = ref(db, `curiers/${task.curierId}`);
        await update(courierRef, {
          liveStatus: 'available'
        });
      }

      // Check how many assignment attempts have been made
      const attempts = task.assignmentAttempts || 1;

      if (attempts >= 2) {
        // After 2 attempts, broadcast to all couriers
        await assignDeliveryToNearestCourier(taskId, true);
      } else {
        // Try another courier
        await reassignDeliveryTask(taskId);
      }
    }
  }
};

// Function to cancel notification timeout when courier responds
export const cancelNotificationTimeout = (taskId) => {
  if (notificationTimeouts[taskId]) {
    clearTimeout(notificationTimeouts[taskId]);
    delete notificationTimeouts[taskId];
  }
};

// Function to listen for courier status changes and check expired tasks
export const monitorCourierAvailability = () => {
  // Check for expired tasks every 30 seconds
  setInterval(() => {
    checkExpiredTasks();
  }, 30 * 1000);
};

// Function to accept a task
export const acceptTask = async (taskId, courierId) => {
  const db = getDatabase();
  const taskRef = ref(db, `deliveryTasks/${taskId}`);

  // Get current task data
  const snapshot = await get(taskRef);
  if (!snapshot.exists()) {
    throw new Error(`Task ${taskId} not found`);
  }

  const task = snapshot.val();

  // Verify this courier is assigned to this task or it's broadcast
  if (task.curierId !== courierId && task.status !== 'broadcast') {
    throw new Error(`Courier ${courierId} not authorized to accept task ${taskId}`);
  }

  // Clear any pending timeout
  if (notificationTimeouts[taskId]) {
    clearTimeout(notificationTimeouts[taskId]);
    delete notificationTimeouts[taskId];
  }

  // Update task status
  const now = new Date().toISOString();

  // Create statusTimestamps object if it doesn't exist
  let statusTimestamps = task.statusTimestamps || {};
  statusTimestamps = {
    ...statusTimestamps,
    accepted: now
  };

  await update(taskRef, {
    curierId: courierId,
    status: 'accepted',
    acceptedAt: now,
    statusTimestamps: statusTimestamps
  });

  // Update courier status to busy - this is when the courier actually becomes busy
  // Before this, they were just considering the task (pending_acceptance)
  const courierRef = ref(db, `curiers/${courierId}`);
  await update(courierRef, {
    liveStatus: 'busy'
  });

  // Task accepted by courier
  return true;
};

// Function to reject a task
export const rejectTask = async (taskId, courierId) => {
  const db = getDatabase();
  const taskRef = ref(db, `deliveryTasks/${taskId}`);

  // Get current task data
  const snapshot = await get(taskRef);
  if (!snapshot.exists()) {
    throw new Error(`Task ${taskId} not found`);
  }

  const task = snapshot.val();

  // Verify this courier is assigned to this task
  if (task.curierId !== courierId) {
    throw new Error(`Courier ${courierId} not authorized to reject task ${taskId}`);
  }

  // Clear any pending timeout
  if (notificationTimeouts[taskId]) {
    clearTimeout(notificationTimeouts[taskId]);
    delete notificationTimeouts[taskId];
  }

  // Task rejected by courier

  // Update courier status back to available
  const courierRef = ref(db, `curiers/${courierId}`);
  await update(courierRef, {
    liveStatus: 'available'
  });

  // Reassign task
  const attempts = task.assignmentAttempts || 1;
  if (attempts >= 2) {
    // After 2 attempts, broadcast to all couriers
    await assignDeliveryToNearestCourier(taskId, true);
  } else {
    // Try another courier
    await reassignDeliveryTask(taskId);
  }

  return true;
};
