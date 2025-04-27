import { useState, useEffect } from "react";
import { getDatabase, ref, onValue, query, orderByChild, equalTo, get, update } from 'firebase/database';
import { fetchCourierById, fetchBusinessById } from "../../services/firebaseService";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import "./BusinessDashboard.css";
import Modal from "../common/Modal";
import DeliveryForm from "../forms/DeliveryForm";
import DeliveryHistoryTable from "../common/DeliveryHistoryTable";
import ActiveDeliveriesTable from "../common/ActiveDeliveriesTable";
import BusinessSettingsForm from "../forms/BusinessSettingsForm";
import { uploadLogo } from "../../services/storageService";

function BusinessDashboard() {
  const [tasks, setTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [couriers, setCouriers] = useState({});
  const [activeTab, setActiveTab] = useState('active');
  const [businessData, setBusinessData] = useState(null);
  const [settingsError, setSettingsError] = useState(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const { userId } = useAuth();
  // Navigation handled by side menu
  const location = useLocation();
  const businessId = userId || 'b46ywnyunei67m'; // Use authenticated business ID or fallback

  // Check for tab in URL query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    const db = getDatabase();

    // Fetch couriers data
    const couriersRef = ref(db, 'curiers');
    onValue(couriersRef, (snapshot) => {
      if (snapshot.exists()) {
        const couriersData = {};
        snapshot.forEach((childSnapshot) => {
          couriersData[childSnapshot.key] = childSnapshot.val();
        });
        setCouriers(couriersData);
      }
    });

    // Fetch active tasks data
    const tasksRef = ref(db, 'deliveryTasks');
    const activeTasksQuery = query(
      tasksRef,
      orderByChild('businessId'),
      equalTo(businessId)
    );

    const unsubscribe = onValue(activeTasksQuery, (snapshot) => {
      if (snapshot.exists()) {
        const tasksData = [];
        snapshot.forEach((childSnapshot) => {
          const task = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          // Only include active tasks
          if (task.status === 'pending_acceptance' || task.status === 'accepted' || task.status === 'picked' || task.status === 'broadcast' || task.status === 'issue_reported') {
            tasksData.push(task);
          }
        });
        setTasks(tasksData);
      } else {
        setTasks([]);
      }
      setLoading(false);
    });

    // Fetch history tasks data
    const historyTasksQuery = query(
      tasksRef,
      orderByChild('businessId'),
      equalTo(businessId)
    );

    const historyUnsubscribe = onValue(historyTasksQuery, (snapshot) => {
      if (snapshot.exists()) {
        const historyData = [];
        snapshot.forEach((childSnapshot) => {
          const task = {
            id: childSnapshot.key,
            ...childSnapshot.val()
          };
          // Only include completed, cancelled, or closed tasks
          if (task.status === 'delivered' || task.status === 'cancelled' || task.status === 'closed') {
            historyData.push(task);
          }
        });
        setHistoryTasks(historyData);
      } else {
        setHistoryTasks([]);
      }
      setHistoryLoading(false);
    });

    return () => {
      unsubscribe();
      historyUnsubscribe();
    };
  }, [businessId]);

  // Load business data for settings tab
  useEffect(() => {
    const loadBusinessData = async () => {
      if (activeTab === 'settings') {
        setSettingsLoading(true);
        try {
          const business = await fetchBusinessById(businessId);
          if (business) {
            setBusinessData(business);
          }
        } catch (error) {
          console.error("Error loading business data:", error);
          setSettingsError("שגיאה בטעינת נתוני העסק");
        } finally {
          setSettingsLoading(false);
        }
      }
    };

    loadBusinessData();
  }, [businessId, activeTab]);

  useEffect(() => {
    // Load couriers data for assigned tasks
    const loadCourierDetails = async (courierId) => {
      try {
        const courierData = await fetchCourierById(courierId);
        if (courierData) {
          setCouriers(prev => ({
            ...prev,
            [courierId]: courierData
          }));
        }
      } catch (error) {
        console.error("Error loading courier details:", error);
      }
    };

    // כאשר יש שינוי במשימות, טען את פרטי השליחים הרלוונטיים
    tasks.forEach(task => {
      if (task.curierId && !couriers[task.curierId]) {
        loadCourierDetails(task.curierId);
      }
    });
  }, [tasks, couriers]);

  const handleCreateShipment = () => {
    setShowDeliveryForm(true);
  };

  // Handle business settings update
  const handleUpdateSettings = async (formData) => {
    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      const db = getDatabase();
      const businessRef = ref(db, `businesses/${businessId}`);

      // Prepare update data
      const updateData = {
        businessAddress: formData.address,
        businessContactName: formData.contactPersonName,
        businessContactPhone: formData.contactPersonPhone,
        deliveryInstructions: formData.deliveryInstructions || ''
      };

      // Handle logo upload if provided
      if (formData.logo) {
        try {
          // Check if the file is too large (limit to 2MB for Base64 storage in DB)
          const fileSizeMB = formData.logo.size / (1024 * 1024);
          if (fileSizeMB > 2) {
            throw new Error('הקובץ גדול מדי. הגבלה היא 2MB');
          }

          const logoUrl = await uploadLogo(formData.logo, 'business', businessId);
          updateData.logoUrl = logoUrl;
        } catch (error) {
          console.error('Error processing logo:', error);
          setSettingsError(`שגיאה בעיבוד הלוגו: ${error.message}`);
          setSettingsLoading(false);
          return;
        }
      }

      // Update business data
      await update(businessRef, updateData);

      // Refresh business data
      const updatedBusiness = await fetchBusinessById(businessId);
      setBusinessData(updatedBusiness);

      // Show success message
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000); // Hide success message after 3 seconds
    } catch (error) {
      console.error('Error updating business settings:', error);
      setSettingsError(`שגיאה בעדכון הגדרות העסק: ${error.message}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Function to handle closing a delivery with issue
  const handleCloseDelivery = async (taskId) => {
    try {
      const db = getDatabase();
      const taskRef = ref(db, `deliveryTasks/${taskId}`);

      // Update task status to closed
      const now = new Date().toISOString();

      // Get the current task to access its statusTimestamps
      const taskSnapshot = await get(taskRef);
      if (!taskSnapshot.exists()) {
        console.error('Task not found:', taskId);
        return;
      }

      const task = taskSnapshot.val();

      // Create statusTimestamps object if it doesn't exist
      let statusTimestamps = task.statusTimestamps || {};
      statusTimestamps = {
        ...statusTimestamps,
        closed: now
      };

      // שמור את סוג התקלה כאשר סוגרים משלוח
      const updateData = {
        status: 'closed',
        closedAt: now,
        statusTimestamps: statusTimestamps
      };

      // אם יש סוג תקלה, שמור אותו גם במשלוח הסגור
      if (task.issueType) {
        updateData.issueType = task.issueType;
      }

      // אם יש הערות תקלה, שמור אותן גם במשלוח הסגור
      if (task.issueComments) {
        updateData.issueComments = task.issueComments;
      }

      await update(taskRef, updateData);

      console.log('Delivery closed successfully:', taskId);
    } catch (error) {
      console.error('Error closing delivery:', error);
    }
  };

  // Render active tasks
  const renderActiveTasks = () => {
    return (
      <>
        <h2>משלוחים פעילים</h2>
        <ActiveDeliveriesTable
          deliveries={tasks}
          loading={loading}
          couriers={couriers}
          showCourierColumn={true}
          userRole="business"
          onTaskAction={(taskId, action) => {
            if (action === "close") {
              handleCloseDelivery(taskId);
            }
          }}
        />
      </>
    );
  };

  // Render history tasks
  const renderHistoryTasks = () => {
    return (
      <DeliveryHistoryTable
        deliveries={historyTasks}
        loading={historyLoading}
        couriers={couriers}
        showCourierColumn={true}
      />
    );
  };

  // Render settings tab
  const renderSettings = () => {
    if (settingsLoading && !businessData) {
      return <div className="loading-indicator">טוען נתוני עסק...</div>;
    }

    const initialValues = businessData ? {
      address: businessData.businessAddress || '',
      contactPersonName: businessData.businessContactName || '',
      contactPersonPhone: businessData.businessContactPhone || '',
      deliveryInstructions: businessData.deliveryInstructions || '',
      logo: null // File input can't be pre-filled for security reasons
    } : {};

    return (
      <div className="settings-container">
        <h2>הגדרות עסק</h2>

        {settingsError && (
          <div className="error-message">{settingsError}</div>
        )}

        {settingsSuccess && (
          <div className="success-message">הגדרות העסק עודכנו בהצלחה!</div>
        )}

        <BusinessSettingsForm
          initialValues={initialValues}
          onSubmit={handleUpdateSettings}
          onClose={() => {}} // Not used in this context
        />

        {businessData && businessData.logoUrl && (
          <div className="current-logo">
            <h3>לוגו נוכחי</h3>
            <img
              src={businessData.logoUrl}
              alt="לוגו העסק"
              style={{ maxWidth: '200px', maxHeight: '200px' }}
            />
          </div>
        )}
      </div>
    );
  };

  // Logout handled by side menu

  return (
    <div className="business-dashboard">

      <div className="dashboard-content">
        {activeTab === 'active' && (
          <>
            {renderActiveTasks()}
          </>
        )}
        {activeTab === 'history' && renderHistoryTasks()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {activeTab === 'active' && (
        <button className="add-task-btn" onClick={handleCreateShipment}>+</button>
      )}

      <Modal isOpen={showDeliveryForm} onClose={() => setShowDeliveryForm(false)}>
        <DeliveryForm
          onClose={() => setShowDeliveryForm(false)}
          onSuccess={() => setShowDeliveryForm(false)}
          businessId={businessId}
        />
      </Modal>
    </div>
  );
}

export default BusinessDashboard;
