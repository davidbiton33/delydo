import { useState, useEffect } from "react";
import {
  getDatabase,
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  update,
  get,
} from "firebase/database";
import {
  acceptTask,
  rejectTask,
} from "../../services/courierNotificationService";
import { fetchBusinessById } from "../../services/firebaseService";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import IssueReportModal from "../modals/IssueReportModal";
import BusinessLogo from "../common/BusinessLogo";
import Switch from "../common/Switch";
import DeliveryHistoryTable from "../common/DeliveryHistoryTable";
import ActiveDeliveriesTable from "../common/ActiveDeliveriesTable";
import { isWithinRange } from "../../utils/locationUtils";
import "./CourierDashboard.css";

function CourierDashboard() {
  const [tasks, setTasks] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [broadcastTasks, setBroadcastTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [businesses, setBusinesses] = useState({});
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [courierStatus, setCourierStatus] = useState(true);
  const [courierLiveStatus, setCourierLiveStatus] = useState("available");
  const [statusLoading, setStatusLoading] = useState(true);
  const [courierLocation, setCourierLocation] = useState({ latitude: 0, longitude: 0 });
  const [locationError, setLocationError] = useState(null);

  // Get courier ID from auth context
  const { userId } = useAuth();
  const location = useLocation();
  const courierId = userId;

  // Check for tab in URL query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    // Load courier status
    const db = getDatabase();
    const courierRef = ref(db, `curiers/${courierId}`);

    // Get initial status
    get(courierRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const courierData = snapshot.val();
          setCourierStatus(courierData.status || false);
          setCourierLiveStatus(courierData.liveStatus || "available");
        }
        setStatusLoading(false);
      })
      .catch(() => {
        // Error fetching courier status
        setStatusLoading(false);
      });

    // Listen for status changes
    const statusUnsubscribe = onValue(courierRef, (snapshot) => {
      if (snapshot.exists()) {
        const courierData = snapshot.val();
        setCourierStatus(courierData.status || false);
        setCourierLiveStatus(courierData.liveStatus || "available");
      }
    });

    // Load businesses data
    const businessesRef = ref(db, "businesses");

    onValue(businessesRef, (snapshot) => {
      if (snapshot.exists()) {
        const businessesData = {};
        snapshot.forEach((childSnapshot) => {
          businessesData[childSnapshot.key] = childSnapshot.val();
        });
        setBusinesses(businessesData);
      }
    });

    // Load assigned tasks
    const courierTasksQuery = query(
      ref(db, "deliveryTasks"),
      orderByChild("curierId"),
      equalTo(courierId)
    );

    const unsubscribe = onValue(courierTasksQuery, (snapshot) => {
      if (snapshot.exists()) {
        const tasksData = [];
        const pendingTasksData = [];

        snapshot.forEach((childSnapshot) => {
          const task = {
            id: childSnapshot.key,
            ...childSnapshot.val(),
          };

          if (task.status === "pending_acceptance") {
            pendingTasksData.push(task);
          } else if (task.status === "accepted" || task.status === "picked" || task.status === "issue_reported") {
            tasksData.push(task);
          }
        });

        setTasks(tasksData);
        setPendingTasks(pendingTasksData);
      } else {
        setTasks([]);
        setPendingTasks([]);
      }
    });

    // Load broadcast tasks
    const broadcastTasksQuery = query(
      ref(db, "deliveryTasks"),
      orderByChild("status"),
      equalTo("broadcast")
    );

    const broadcastUnsubscribe = onValue(broadcastTasksQuery, (snapshot) => {
      if (snapshot.exists()) {
        const broadcastTasksData = [];

        snapshot.forEach((childSnapshot) => {
          broadcastTasksData.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });

        setBroadcastTasks(broadcastTasksData);
      } else {
        setBroadcastTasks([]);
      }

      setLoading(false);
    });

    // Load history tasks (delivered or cancelled by this courier)
    const historyTasksQuery = query(
      ref(db, "deliveryTasks"),
      orderByChild("curierId"),
      equalTo(courierId)
    );

    const historyUnsubscribe = onValue(historyTasksQuery, (snapshot) => {
      if (snapshot.exists()) {
        const historyTasksData = [];

        snapshot.forEach((childSnapshot) => {
          const task = {
            id: childSnapshot.key,
            ...childSnapshot.val(),
          };

          // Only include completed, cancelled, or closed tasks
          if (task.status === "delivered" || task.status === "cancelled" || task.status === "closed" || task.status === "issue_reported") {
            historyTasksData.push(task);
          }
        });

        setHistoryTasks(historyTasksData);
      } else {
        setHistoryTasks([]);
      }

      setHistoryLoading(false);
    });

    return () => {
      unsubscribe();
      broadcastUnsubscribe();
      historyUnsubscribe();
      statusUnsubscribe && statusUnsubscribe();
    };
  }, [courierId]);

  useEffect(() => {
    // Load business data for tasks
    const loadBusinessDetails = async (businessId) => {
      try {
        const businessData = await fetchBusinessById(businessId);
        if (businessData) {
          setBusinesses((prev) => ({
            ...prev,
            [businessId]: businessData,
          }));
        }
      } catch {
        // Error loading business details
      }
    };

    // כאשר יש שינוי במשימות, טען את פרטי העסקים הרלוונטיים
    const allTasks = [
      ...tasks,
      ...pendingTasks,
      ...broadcastTasks,
      ...historyTasks,
    ];
    allTasks.forEach((task) => {
      if (task.businessId && !businesses[task.businessId]) {
        loadBusinessDetails(task.businessId);
      }
    });
  }, [tasks, pendingTasks, broadcastTasks, historyTasks, businesses]);

  // Function to handle task acceptance
  const handleAcceptTask = async (taskId) => {
    try {
      // When accepting a task, the courier becomes busy
      await acceptTask(taskId, courierId);
      // Update local state to reflect the change immediately
      setCourierLiveStatus("busy");
    } catch {
      // Error accepting task
      alert("שגיאה בקבלת המשלוח. נסה שוב.");
    }
  };

  // Function to handle task rejection
  const handleRejectTask = async (taskId) => {
    try {
      // When rejecting a task, the courier becomes available again
      await rejectTask(taskId, courierId);
      // Update local state to reflect the change immediately
      setCourierLiveStatus("available");
    } catch {
      // Error rejecting task
      alert("שגיאה בדחיית המשלוח. נסה שוב.");
    }
  };

  // Function to get the courier's current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCourierLocation(location);
          resolve(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('לא ניתן לקבל את המיקום הנוכחי. אנא אפשר גישה למיקום.');
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Function to update task status
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const db = getDatabase();
      const taskRef = ref(db, `deliveryTasks/${taskId}`);

      // Get the task data
      const taskSnapshot = await get(taskRef);
      if (!taskSnapshot.exists()) {
        throw new Error('המשלוח לא נמצא');
      }

      const task = taskSnapshot.val();

      // Get current location
      const currentLocation = await getCurrentLocation();

      // Check if courier is within range for pickup or delivery
      if (newStatus === "picked") {
        // Check if courier is near the business
        const business = businesses[task.businessId];
        if (!business) {
          throw new Error('העסק לא נמצא');
        }

        const isNearBusiness = isWithinRange(
          currentLocation.latitude,
          currentLocation.longitude,
          business.businessLatitude,
          business.businessLongitude,
          0.05 // 50 meters in kilometers
        );

        if (!isNearBusiness) {
          setLocationError('עליך להיות במרחק של עד 50 מטר מהעסק כדי לבצע איסוף');
          setTimeout(() => setLocationError(null), 3000);
          return;
        }
      } else if (newStatus === "delivered") {
        // Check if courier is near the client
        if (!task.clientLatitude || !task.clientLongitude) {
          // If client coordinates are not available, try to use the coordinates from the client record
          if (task.clientId) {
            const clientRef = ref(db, `businessClients/${task.clientId}`);
            const clientSnapshot = await get(clientRef);
            if (clientSnapshot.exists()) {
              const client = clientSnapshot.val();
              if (client.clientLatitude && client.clientLongitude) {
                const isNearClient = isWithinRange(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  client.clientLatitude,
                  client.clientLongitude,
                  0.05 // 50 meters in kilometers
                );

                if (!isNearClient) {
                  setLocationError('עליך להיות במרחק של עד 50 מטר מהלקוח כדי לבצע מסירה');
                  setTimeout(() => setLocationError(null), 3000);
                  return;
                }
              }
            }
          } else {
            // If we can't verify location, allow the action but log a warning
            console.warn('Unable to verify client location - allowing delivery without location check');
          }
        } else {
          const isNearClient = isWithinRange(
            currentLocation.latitude,
            currentLocation.longitude,
            task.clientLatitude,
            task.clientLongitude,
            0.05 // 50 meters in kilometers
          );

          if (!isNearClient) {
            setLocationError('עליך להיות במרחק של עד 50 מטר מהלקוח כדי לבצע מסירה');
            setTimeout(() => setLocationError(null), 3000);
            return;
          }
        }
      }

      const updates = {
        status: newStatus,
      };

      // Add timestamp for the current status change
      const now = new Date().toISOString();

      // בפיירבייס לא ניתן להשתמש בנקודות בשמות מפתחות, לכן נשתמש באובייקט מקונן
      if (!updates.statusTimestamps) {
        updates.statusTimestamps = {};
      }
      updates.statusTimestamps[newStatus] = now;

      // Add specific timestamps for backward compatibility
      if (newStatus === "picked") {
        updates.pickedUpAt = now;
      }

      // Add delivered timestamp if delivered
      if (newStatus === "delivered") {
        updates.deliveredAt = now;

        // Update courier status back to available
        const courierRef = ref(db, `curiers/${courierId}`);
        update(courierRef, {
          liveStatus: "available",
        });

        // Update local state to reflect the change immediately
        setCourierLiveStatus("available");
      }

      // Add issue reported timestamp if reporting an issue
      if (newStatus === "issue") {
        updates.issueReportedAt = now;
      }

      await update(taskRef, updates);
      // Task updated successfully
    } catch (error) {
      console.error('Error updating task status:', error);
      setLocationError(error.message || 'אירעה שגיאה בעדכון סטטוס המשלוח');
      setTimeout(() => setLocationError(null), 3000);
    }
  };

  // Render active tasks and notifications
  const renderActiveTasks = () => {
    if (loading) {
      return <p className="loading">טוען משימות...</p>;
    }

    // If courier is not active, show only the status message
    if (!courierStatus) {
      return (
        <div className="broadcast-tasks-section">
          <div className="status-message-container">
            <div className="status-message">
              <h3>משלוחים זמינים</h3>
              <p>עבור למצב פעיל בכדי לראות משלוחים</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Pending tasks section */}
        {pendingTasks.length > 0 && (
          <div className="pending-tasks-section">
            <h2>משלוחים ממתינים לאישור שלך</h2>
            <div className="tasks-container">
              {pendingTasks.map((task) => {
                const business = task.businessId
                  ? businesses[task.businessId]
                  : null;

                return (
                  <div key={task.id} className="task-card pending">
                    {/* Show only business details and destination address */}
                    {business && (
                      <div className="business-details highlighted-details">
                        <div className="business-header">
                          <BusinessLogo
                            logoUrl={business.logoUrl}
                            businessName={business.businessName}
                            size="small"
                          />
                          <p>
                            <strong>עסק:</strong> {business.businessName}
                          </p>
                        </div>
                        <p>
                          <strong>כתובת איסוף:</strong>{" "}
                          {business.businessAddress}
                        </p>
                        <p>
                          <strong>כתובת יעד:</strong> {task.deliveryAddress}
                        </p>
                      </div>
                    )}

                    <div className="task-actions">
                      <button
                        className="action-btn accept-btn"
                        onClick={() => handleAcceptTask(task.id)}
                      >
                        אשר משלוח
                      </button>
                      <button
                        className="action-btn reject-btn"
                        onClick={() => handleRejectTask(task.id)}
                      >
                        דחה משלוח
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Broadcast tasks section - only shown if courier is active and available or has pending tasks */}
        {courierStatus &&
        (courierLiveStatus === "available" ||
          courierLiveStatus === "busy" ||
          courierLiveStatus === "pending_acceptance") ? (
          broadcastTasks.length > 0 && (
            <div className="broadcast-tasks-section">
              <h2>משלוחים חדשים</h2>
              <div className="tasks-container">
                {broadcastTasks.map((task) => {
                  const business = task.businessId
                    ? businesses[task.businessId]
                    : null;

                  return (
                    <div key={task.id} className="task-card broadcast">
                      {/* Show only business details and destination address */}
                      {business && (
                        <div className="business-details highlighted-details">
                          <div className="business-header">
                            <BusinessLogo
                              logoUrl={business.logoUrl}
                              businessName={business.businessName}
                              size="small"
                            />
                            <p>
                              <strong>עסק:</strong> {business.businessName}
                            </p>
                          </div>
                          <p>
                            <strong>כתובת איסוף:</strong>{" "}
                            {business.businessAddress}
                          </p>
                        </div>
                      )}
                      <p>
                        <strong>כתובת יעד:</strong> {task.deliveryAddress}
                      </p>

                      <div className="task-actions">
                        <button
                          className="action-btn accept-btn"
                          onClick={() => handleAcceptTask(task.id)}
                        >
                          קח משלוח
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          <div className="broadcast-tasks-section">
            <div className="status-message-container">
              <div className="status-message">
                <h3>משלוחים זמינים</h3>
                {!courierStatus ? (
                  <p>עבור למצב פעיל בכדי לראות משלוחים</p>
                ) : (
                  <p>אין משלוחים זמינים כרגע.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active tasks section */}
        <div className="active-tasks-section">
          <h2>משלוחים פעילים</h2>
          <ActiveDeliveriesTable
            deliveries={tasks}
            loading={loading}
            businesses={businesses}
            showBusinessColumn={true}
            userRole="courier"
            onTaskAction={(taskId, action) => {
              if (action === "picked") {
                updateTaskStatus(taskId, "picked");
              } else if (action === "delivered") {
                updateTaskStatus(taskId, "delivered");
              } else if (action === "issue") {
                setSelectedTaskId(taskId);
                setShowIssueModal(true);
              }
            }}
          />
        </div>
      </>
    );
  };

  // Render history tasks
  const renderHistoryTasks = () => {
    return (
      <div className="history-tasks-section">
        <h2>היסטוריית משלוחים</h2>
        <DeliveryHistoryTable
          deliveries={historyTasks}
          loading={historyLoading}
          businesses={businesses}
          showBusinessColumn={true}
        />
      </div>
    );
  };

  const [statusError, setStatusError] = useState(null);

  // Toggle courier status
  const toggleCourierStatus = () => {
    // Clear any previous error
    setStatusError(null);

    // If trying to deactivate and has active tasks, prevent it
    // Only check for tasks that are actually active (accepted or picked)
    // Don't prevent deactivation if only pending_acceptance tasks exist
    const activeTasks = tasks.filter(task =>
      task.status === 'accepted' || task.status === 'picked'
    );

    if (courierStatus && activeTasks.length > 0) {
      setStatusError("לא ניתן להתנתק כאשר יש משלוחים פעילים");
      setTimeout(() => setStatusError(null), 3000); // Clear error after 3 seconds
      return;
    }

    const db = getDatabase();
    const courierRef = ref(db, `curiers/${courierId}`);

    // Update status in database
    update(courierRef, {
      status: !courierStatus,
      // Keep the liveStatus as is if there are pending tasks, otherwise update it
      liveStatus: !courierStatus ? "available" : "unavailable",
    })
      .then(() => {
        console.log(
          `Courier status updated to ${!courierStatus ? "active" : "inactive"}`
        );
      })
      .catch((error) => {
        console.error("Error updating courier status:", error);
        // Revert UI state if update fails
        setCourierStatus(courierStatus);
        setCourierLiveStatus(courierLiveStatus);
        setStatusError("אירעה שגיאה בעדכון הסטטוס");
      });
  };

  // Logout handled by side menu

  return (
    <div className="courier-dashboard">
      {/* Location error message */}
      {locationError && (
        <div className="location-error-container">
          <p className="location-error">{locationError}</p>
        </div>
      )}

      <div className="dashboard-content">
        {activeTab === "active" && renderActiveTasks()}
        {activeTab === "history" && renderHistoryTasks()}
      </div>

      {/* Added switch here - at the bottom of the dashboard */}
      {activeTab === "active" && (
        <div className="courier-status-container bottom-fixed">
          {statusLoading ? (
            <p>טוען סטטוס...</p>
          ) : (
            <>
              <Switch
                isOn={courierStatus}
                handleToggle={toggleCourierStatus}
                labelText=""
                onText=""
                offText=""
              />
              {statusError && <p className="status-error">{statusError}</p>}
            </>
          )}
        </div>
      )}

      {/* Issue Report Modal */}
      <IssueReportModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        taskId={selectedTaskId}
        onSuccess={() => {
          // Refresh will happen automatically via Firebase listeners
          setShowIssueModal(false);
        }}
      />
    </div>
  );
}

export default CourierDashboard;
