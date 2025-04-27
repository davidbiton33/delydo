import { useState, useEffect } from "react";
import { getDatabase, ref, onValue, remove } from 'firebase/database';
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import "./SuperAdminDashboard.css";
import Modal from "../common/Modal";
import DeliveryCompanyForm from "../forms/DeliveryCompanyForm";
import BusinessForm from "../forms/BusinessForm";
import CourierForm from "../forms/CourierForm";
import DeliveryForm from "../forms/DeliveryForm";
import UserEditForm from "../forms/UserEditForm";
import BusinessLogo from "../common/BusinessLogo";
import DeliveryCompanyLogo from "../common/DeliveryCompanyLogo";
import DeliveryHistoryTable from "../common/DeliveryHistoryTable";
import ActiveDeliveriesTable from "../common/ActiveDeliveriesTable";

function SuperAdminDashboard() {
  const [businesses, setBusinesses] = useState({});
  const [couriers, setCouriers] = useState({});
  const [users, setUsers] = useState({});
  const [deliveryTasks, setDeliveryTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliveryCompanies, setDeliveryCompanies] = useState({});
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showCourierForm, setShowCourierForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showUserEditForm, setShowUserEditForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { userId } = useAuth();
  // Navigation handled by side menu
  const location = useLocation();

  // Update for tab in URL query params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
      // Save the last active tab to localStorage
      localStorage.setItem('lastSuperAdminTab', tab);
    }
  }, [location]);

  useEffect(() => {
    const db = getDatabase();

    // Fetch delivery companies data
    const companiesRef = ref(db, 'deliveryCompanies');
    const companiesUnsubscribe = onValue(companiesRef, (snapshot) => {
      if (snapshot.exists()) {
        setDeliveryCompanies(snapshot.val());
      } else {
        setDeliveryCompanies({});
      }
    });

    // Fetch businesses data
    const businessesRef = ref(db, 'businesses');
    const businessesUnsubscribe = onValue(businessesRef, (snapshot) => {
      if (snapshot.exists()) {
        setBusinesses(snapshot.val());
      } else {
        setBusinesses({});
      }
    });

    // Fetch couriers data
    const couriersRef = ref(db, 'curiers');
    const couriersUnsubscribe = onValue(couriersRef, (snapshot) => {
      if (snapshot.exists()) {
        setCouriers(snapshot.val());
      } else {
        setCouriers({});
      }
    });

    // Fetch users data
    const usersRef = ref(db, 'users');
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setUsers(snapshot.val());
      } else {
        setUsers({});
      }
    });

    // Fetch delivery tasks
    const tasksRef = ref(db, 'deliveryTasks');
    const tasksUnsubscribe = onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        setDeliveryTasks(snapshot.val());
      } else {
        setDeliveryTasks({});
      }
      setLoading(false);
    });

    return () => {
      companiesUnsubscribe();
      businessesUnsubscribe();
      couriersUnsubscribe();
      usersUnsubscribe();
      tasksUnsubscribe();
    };
  }, []);

  // Function to delete a delivery company
  const deleteDeliveryCompany = async (companyId) => {
    try {
      const db = getDatabase();
      const companyRef = ref(db, `deliveryCompanies/${companyId}`);
      await remove(companyRef);

      // Also delete the user account associated with this company
      const userRef = ref(db, `users/${companyId}`);
      await remove(userRef);
    } catch (error) {
      console.error("Error deleting delivery company:", error);
      throw error;
    }
  };

  // Function to delete a business
  const deleteBusiness = async (businessId) => {
    try {
      const db = getDatabase();
      const businessRef = ref(db, `businesses/${businessId}`);
      await remove(businessRef);
    } catch (error) {
      console.error("Error deleting business:", error);
      throw error;
    }
  };

  // Function to delete a courier
  const deleteCourier = async (courierId) => {
    try {
      const db = getDatabase();
      const courierRef = ref(db, `curiers/${courierId}`);
      await remove(courierRef);
    } catch (error) {
      console.error("Error deleting courier:", error);
      throw error;
    }
  };

  // Function to delete a user
  const deleteUser = async (userId) => {
    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${userId}`);
      await remove(userRef);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  // Render dashboard statistics
  const renderDashboard = () => {
    return (
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>חברות משלוחים</h3>
          <p className="stat-number">{Object.keys(deliveryCompanies).length}</p>
        </div>
        <div className="stat-card">
          <h3>עסקים</h3>
          <p className="stat-number">{Object.keys(businesses).length}</p>
        </div>
        <div className="stat-card">
          <h3>שליחים</h3>
          <p className="stat-number">{Object.keys(couriers).length}</p>
        </div>
        <div className="stat-card">
          <h3>משתמשים</h3>
          <p className="stat-number">{Object.keys(users).length}</p>
        </div>
        <div className="stat-card">
          <h3>משלוחים</h3>
          <p className="stat-number">{Object.keys(deliveryTasks).length}</p>
        </div>
      </div>
    );
  };

  // Render delivery companies management
  const renderDeliveryCompanies = () => {
    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>ניהול חברות משלוחים</h2>
          <button className="btn-add" onClick={() => setShowCompanyForm(true)}>
            הוסף חברת משלוחים
          </button>
        </div>
        <div className="data-cards">
          {Object.entries(deliveryCompanies).map(([companyId, companyData]) => (
            <div key={companyId} className="data-card data-card-with-logo">
              <DeliveryCompanyLogo
                logoUrl={companyData.logoUrl}
                companyName={companyData.companyName}
                size="large"
              />
              <div className="data-card-content">
                <h3>{companyData.companyName}</h3>
                <p><strong>כתובת:</strong> {companyData.companyAddress || 'לא צוין'}</p>
                <p><strong>איש קשר:</strong> {companyData.companyContactName}</p>
                <p><strong>טלפון:</strong> {companyData.companyContactPhone}</p>
                <p><strong>אימייל:</strong> {companyData.companyEmail}</p>
                <p><strong>סטטוס:</strong> {companyData.status === 'active' ? 'פעיל' : 'לא פעיל'}</p>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm(`האם אתה בטוח שברצונך למחוק את חברת המשלוחים ${companyData.companyName}?`)) {
                      deleteDeliveryCompany(companyId);
                    }
                  }}
                >
                  מחק חברה
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render users management
  const renderUsers = () => {
    return (
      <div className="admin-section">
        <h2>ניהול משתמשים</h2>
        <div className="data-cards">
          {Object.entries(users)
            .filter(([id, _]) => id !== userId) // Filter out the current user
            .map(([userId, userData]) => (
            <div key={userId} className="data-card">
              <h3>{userData.displayName}</h3>
              <p><strong>אימייל:</strong> {userData.email}</p>
              <p><strong>תפקידים:</strong> {
                Object.keys(userData.roles || {}).map(role =>
                  role === 'business' ? 'עסק' :
                  role === 'courier' ? 'שליח' :
                  role === 'superAdmin' ? 'מנהל מערכת עליון' :
                  role === 'admin' ? 'מנהל מערכת' : role
                ).join(', ')
              }</p>
              <div className="card-actions">
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSelectedUserId(userId);
                    setShowUserEditForm(true);
                  }}
                >
                  ערוך
                </button>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userData.displayName}?`)) {
                      deleteUser(userId);
                    }
                  }}
                >
                  מחק משתמש
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render businesses management
  const renderBusinesses = () => {
    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>ניהול עסקים</h2>
          <button className="btn-add" onClick={() => setShowBusinessForm(true)}>
            הוסף עסק
          </button>
        </div>
        <div className="data-cards">
          {Object.entries(businesses).map(([businessId, businessData]) => (
            <div key={businessId} className="data-card data-card-with-logo">
              <BusinessLogo
                logoUrl={businessData.logoUrl}
                businessName={businessData.businessName}
                size="large"
              />
              <div className="data-card-content">
                <h3>{businessData.businessName}</h3>
                <p><strong>כתובת:</strong> {businessData.businessAddress}</p>
                <p><strong>איש קשר:</strong> {businessData.businessContactName}</p>
                <p><strong>טלפון:</strong> {businessData.businessContactPhone}</p>
                  <p><strong>סטטוס:</strong> {businessData.status === 'active' ? 'פעיל' : 'לא פעיל'}</p>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm(`האם אתה בטוח שברצונך למחוק את העסק ${businessData.businessName}?`)) {
                      deleteBusiness(businessId);
                    }
                  }}
                >
                  מחק עסק
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render couriers management
  const renderCouriers = () => {
    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>ניהול שליחים</h2>
          <button className="btn-add" onClick={() => setShowCourierForm(true)}>
            הוסף שליח
          </button>
        </div>
        <div className="data-cards">
          {Object.entries(couriers).map(([courierId, courierData]) => (
            <div key={courierId} className="data-card">
              <h3>{courierData.curierName}</h3>
              <p><strong>טלפון:</strong> {courierData.curierPhone}</p>
              <p><strong>סטטוס:</strong> {courierData.status ? 'פעיל' : 'לא פעיל'}</p>
              <p><strong>סטטוס חי:</strong> {courierData.liveStatus || 'לא ידוע'}</p>
              <button
                className="btn-danger"
                onClick={() => {
                  if (window.confirm(`האם אתה בטוח שברצונך למחוק את השליח ${courierData.curierName}?`)) {
                    deleteCourier(courierId);
                  }
                }}
              >
                מחק שליח
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render deliveries management
  const renderDeliveries = () => {
    // Active deliveries (pending, broadcast, accepted, picked)
    const activeDeliveries = Object.entries(deliveryTasks)
      .filter(([_, data]) =>
        ['pending_acceptance', 'broadcast', 'accepted', 'picked'].includes(data.status)
      )
      .map(([id, data]) => ({ id, ...data }));

    // Completed deliveries (delivered, cancelled, issue_reported)
    const completedDeliveries = Object.entries(deliveryTasks)
      .filter(([_, data]) =>
        ['delivered', 'cancelled', 'issue_reported'].includes(data.status)
      )
      .map(([id, data]) => ({ id, ...data }));

    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>ניהול משלוחים</h2>
          <button className="btn-add" onClick={() => setShowDeliveryForm(true)}>
            הוסף משלוח
          </button>
        </div>

        <div className="deliveries-tabs">
          <h3>משלוחים פעילים</h3>
          <ActiveDeliveriesTable
            deliveries={activeDeliveries}
            loading={loading}
            businesses={businesses}
            couriers={couriers}
            showBusinessColumn={true}
            showCourierColumn={true}
            userRole="superAdmin"
          />
        </div>

        <div className="deliveries-tabs">
          <h3>היסטוריית משלוחים</h3>
          <DeliveryHistoryTable
            deliveries={completedDeliveries}
            loading={loading}
            businesses={businesses}
            couriers={couriers}
            showBusinessColumn={true}
            showCourierColumn={true}
          />
        </div>
      </div>
    );
  };

  // Logout handled by side menu

  return (
    <div className="super-admin-dashboard">
      <div className="dashboard-header">
        <h1>לוח בקרה למנהל מערכת עליון</h1>
      </div>

      {/* Admin tabs removed - now only in side menu */}

      {loading ? (
        <p className="loading">טוען נתונים...</p>
      ) : (
        <div className="admin-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'companies' && renderDeliveryCompanies()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'businesses' && renderBusinesses()}
          {activeTab === 'couriers' && renderCouriers()}
          {activeTab === 'deliveries' && renderDeliveries()}
        </div>
      )}

      {/* Modals for adding new entities */}
      <Modal isOpen={showCompanyForm} onClose={() => setShowCompanyForm(false)}>
        <DeliveryCompanyForm
          onClose={() => setShowCompanyForm(false)}
          onSuccess={() => setShowCompanyForm(false)}
        />
      </Modal>

      <Modal isOpen={showBusinessForm} onClose={() => setShowBusinessForm(false)}>
        <BusinessForm
          onClose={() => setShowBusinessForm(false)}
          onSuccess={() => setShowBusinessForm(false)}
        />
      </Modal>

      <Modal isOpen={showCourierForm} onClose={() => setShowCourierForm(false)}>
        <CourierForm
          onClose={() => setShowCourierForm(false)}
          onSuccess={() => setShowCourierForm(false)}
        />
      </Modal>

      <Modal isOpen={showDeliveryForm} onClose={() => setShowDeliveryForm(false)}>
        <DeliveryForm
          onClose={() => setShowDeliveryForm(false)}
          onSuccess={() => setShowDeliveryForm(false)}
        />
      </Modal>

      <Modal isOpen={showUserEditForm} onClose={() => setShowUserEditForm(false)}>
        <UserEditForm
          userId={selectedUserId}
          onClose={() => setShowUserEditForm(false)}
          onSuccess={() => setShowUserEditForm(false)}
        />
      </Modal>
    </div>
  );
}

export default SuperAdminDashboard;
