import { getDatabase, ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { assignDeliveryToNearestCourier } from './deliveryAssignmentService';
import { notifyCourier } from './courierNotificationService';

// Track tasks that are being processed to avoid duplicate assignments
const processingTasks = new Set();

// Function to monitor pending tasks and assign them to couriers
export const monitorPendingTasks = () => {
  const db = getDatabase();
  const tasksRef = ref(db, 'deliveryTasks');
  const pendingTasksQuery = query(tasksRef, orderByChild('status'), equalTo('pending'));

  onValue(pendingTasksQuery, async (snapshot) => {
    if (!snapshot.exists()) return;

    snapshot.forEach(async (childSnapshot) => {
      const taskId = childSnapshot.key;
      const task = childSnapshot.val();

      // Skip if already processing this task
      if (processingTasks.has(taskId)) return;

      // Mark as processing
      processingTasks.add(taskId);

      try {
        console.log(`[SYSTEM] Assigning pending task ${taskId} to nearest courier`);
        const courierId = await assignDeliveryToNearestCourier(taskId);

        if (courierId) {
          // Notify courier about the new task
          notifyCourier(courierId, taskId, 'New delivery task assigned to you');
        } else {
          // No couriers available - keep the task in pending state
          // This fixes the bug where tasks disappear when no couriers are available
          console.log(`[SYSTEM] No couriers available for task ${taskId} - keeping in pending state`);

          // We don't change the task status, so it remains in 'pending' state
          // and will be retried when a courier becomes available
        }
      } catch (error) {
        console.error(`[SYSTEM] Error assigning task ${taskId}:`, error);
      } finally {
        // Remove from processing set
        processingTasks.delete(taskId);
      }
    });
  });
};
