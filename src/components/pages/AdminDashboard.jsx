import { useState, useEffect } from "react";
import { getDatabase, ref, onValue } from 'firebase/database';
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./AdminDashboard.css";
import Modal from "../common/Modal";
import BusinessForm from "../forms/BusinessForm";
import CourierForm from "../forms/CourierForm";
// Client form removed - clients are created during delivery creation
import DeliveryForm from "../forms/DeliveryForm";
import UserEditForm from "../forms/UserEditForm";
import BusinessLogo from "../common/BusinessLogo";
import DeliveryHistoryTable from "../common/DeliveryHistoryTable";
import ActiveDeliveriesTable from "../common/ActiveDeliveriesTable";
// DeliveryCompanyLogo not used in this component

function AdminDashboard() {
  const [businesses, setBusinesses] = useState({});
  const [couriers, setCouriers] = useState({});
  const [users, setUsers] = useState({});
  const [deliveryTasks, setDeliveryTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showCourierForm, setShowCourierForm] = useState(false);
  // Client form removed - clients are created during delivery creation
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showUserEditForm, setShowUserEditForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [clients, setClients] = useState({});
  const { deliveryCompanyId, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // User type and delivery company ID are used for access control

  // Update activeTab based on URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      // Set active tab from URL
      setActiveTab(tab);
    }
  }, [location.search]);

  // Tab navigation is handled by the side menu

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    // Check if we have a delivery company ID
    if (!deliveryCompanyId) {
      // No delivery company ID found
      setLoading(false);
      return;
    }

    const db = getDatabase();
    let businessesUnsubscribe = null;
    let couriersUnsubscribe = null;
    let usersUnsubscribe = null;
    let tasksUnsubscribe = null;
    let clientsUnsubscribe = null;

    // Set loading state
    setLoading(true);

    // Loading data for company ID

    // First fetch delivery tasks filtered by company ID
    const tasksRef = ref(db, 'deliveryTasks');
    tasksUnsubscribe = onValue(tasksRef, (snapshot) => {
      // Delivery tasks loaded
      let filteredTasks = {};

      if (snapshot.exists()) {
        const allTasks = snapshot.val();

        // Filter tasks by company ID
        Object.entries(allTasks).forEach(([id, data]) => {
          if (data.deliveryCompanyId === deliveryCompanyId) {
            filteredTasks[id] = data;
          }
        });
      }

      setDeliveryTasks(filteredTasks);

      // Now load businesses
      loadBusinesses(db, filteredTasks);
    });

    // Function to load businesses
    const loadBusinesses = (db, filteredTasks) => {
      // Clean up previous subscription if exists
      if (businessesUnsubscribe) businessesUnsubscribe();

      const businessesRef = ref(db, 'businesses');
      businessesUnsubscribe = onValue(businessesRef, (snapshot) => {
        // Businesses loaded
        let filteredBusinesses = {};

        if (snapshot.exists()) {
          const allBusinesses = snapshot.val();

          // Filter businesses by company ID or by delivery tasks
          Object.entries(allBusinesses).forEach(([id, data]) => {
            // If the business has a deliveryCompanyId field
            if (data.deliveryCompanyId === deliveryCompanyId) {
              filteredBusinesses[id] = data;
            } else {
              // Check if there are any delivery tasks for this business with this company
              const businessTasks = Object.values(filteredTasks).filter(task =>
                task.businessId === id
              );

              if (businessTasks.length > 0) {
                filteredBusinesses[id] = data;
              }
            }
          });
        }

        setBusinesses(filteredBusinesses);

        // Fetch clients after businesses are loaded
        const clientsRef = ref(db, 'businessClients');
        if (clientsUnsubscribe) clientsUnsubscribe();

        clientsUnsubscribe = onValue(clientsRef, (snapshot) => {
          // Clients loaded
          let filteredClients = {};

          if (snapshot.exists()) {
            const allClients = snapshot.val();

            // We'll collect all business IDs that belong to this company
            const companyBusinessIds = Object.keys(filteredBusinesses);

            // Filter clients by business ID
            Object.entries(allClients).forEach(([id, data]) => {
              if (companyBusinessIds.includes(data.businessId)) {
                filteredClients[id] = data;
              }
            });
          }

          setClients(filteredClients);
        });

        // Now load couriers
        loadCouriers(db, filteredTasks, filteredBusinesses);
      });
    };

    // Function to load couriers
    const loadCouriers = (db, filteredTasks, filteredBusinesses) => {
      // Clean up previous subscription if exists
      if (couriersUnsubscribe) couriersUnsubscribe();

      const couriersRef = ref(db, 'curiers');
      couriersUnsubscribe = onValue(couriersRef, (snapshot) => {
        // Couriers loaded
        let filteredCouriers = {};

        if (snapshot.exists()) {
          const allCouriers = snapshot.val();

          // Filter couriers by company ID or by delivery tasks
          Object.entries(allCouriers).forEach(([id, data]) => {
            // If the courier has a deliveryCompanyId field
            if (data.deliveryCompanyId === deliveryCompanyId) {
              filteredCouriers[id] = data;
            } else {
              // Check if there are any delivery tasks for this courier with this company
              const courierTasks = Object.values(filteredTasks).filter(task =>
                task.curierId === id
              );

              if (courierTasks.length > 0) {
                filteredCouriers[id] = data;
              }
            }
          });
        }

        setCouriers(filteredCouriers);

        // Finally load users
        loadUsers(db, filteredBusinesses, filteredCouriers);
      });
    };

    // Function to load users
    const loadUsers = (db, filteredBusinesses, filteredCouriers) => {
      // Clean up previous subscription if exists
      if (usersUnsubscribe) usersUnsubscribe();

      const usersRef = ref(db, 'users');
      usersUnsubscribe = onValue(usersRef, (snapshot) => {
        // Users loaded
        let filteredUsers = {};

        if (snapshot.exists()) {
          const allUsers = snapshot.val();

          // Filter users by company ID or by association with businesses/couriers
          Object.entries(allUsers).forEach(([id, data]) => {
            // Include users that belong to this delivery company
            if (data.deliveryCompanyId === deliveryCompanyId) {
              filteredUsers[id] = data;
            } else if (data.roles) {
              // Include business users whose business is in our filtered list
              if (data.roles.business) {
                // Find if this user is associated with any of our filtered businesses
                for (const businessId in filteredBusinesses) {
                  if (filteredBusinesses[businessId].email === data.email) {
                    filteredUsers[id] = data;
                    break;
                  }
                }
              }
              // Include courier users who are in our filtered list
              else if (data.roles.courier && filteredCouriers[id]) {
                filteredUsers[id] = data;
              }
              // Include admin users who match the company ID
              else if (data.roles.admin && id === deliveryCompanyId) {
                filteredUsers[id] = data;
              }
            }
          });
        }

        setUsers(filteredUsers);
        setLoading(false);
        // All data loaded
      });
    };

    return () => {
      // Clean up all subscriptions
      if (tasksUnsubscribe) tasksUnsubscribe();
      if (businessesUnsubscribe) businessesUnsubscribe();
      if (couriersUnsubscribe) couriersUnsubscribe();
      if (usersUnsubscribe) usersUnsubscribe();
      if (clientsUnsubscribe) clientsUnsubscribe();
    };
  }, [deliveryCompanyId]);

  // Logout handled by side menu

  return (
    <div className="admin-dashboard">

      {loading ? (
        <p className="loading">טוען נתונים...</p>
      ) : !deliveryCompanyId ? (
        <div className="error-message">
          <h2>שגיאה: לא נמצאה חברת משלוחים</h2>
          <p>אנא התנתק והתחבר מחדש למערכת.</p>
          <button onClick={handleLogout} className="btn-primary">
            התנתקות
          </button>
        </div>
      ) : (
        <div className="admin-sections">
          <div className="admin-content">
            {activeTab === 'dashboard' && (
              <div className="admin-section">
                <h2>סטטיסטיקות חברה</h2>
                <div className="dashboard-stats">
                  <div className="stat-card">
                    <h3>עסקים</h3>
                    <p className="stat-number">{Object.keys(businesses).length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>שליחים</h3>
                    <p className="stat-number">{Object.keys(couriers).length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>לקוחות</h3>
                    <p className="stat-number">{Object.keys(clients).length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>משלוחים</h3>
                    <p className="stat-number">{Object.keys(deliveryTasks).length}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'businesses' && (
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
                        <p><strong>אימייל:</strong> {businessData.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'couriers' && (
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="admin-section">
                <div className="section-header">
                  <h2>ניהול לקוחות</h2>
                  {/* Client addition removed - clients are created automatically during delivery creation */}
                </div>
                <div className="data-cards">
                  {Object.entries(clients).map(([clientId, clientData]) => (
                    <div key={clientId} className="data-card">
                      <h3>{clientData.clientName}</h3>
                      <p><strong>טלפון:</strong> {clientData.clientPhone}</p>
                      <p><strong>כתובת:</strong> {clientData.clientAddress}</p>
                      <p><strong>עסק:</strong> {businesses[clientData.businessId]?.businessName || 'לא ידוע'}</p>
                      {clientData.notes && <p><strong>הערות:</strong> {clientData.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="admin-section">
                <h2>ניהול משתמשים</h2>
                <div className="data-cards">
                  {Object.entries(users).map(([userIdItem, userData]) => (
                    <div key={userIdItem} className="data-card">
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
                            setSelectedUserId(userIdItem);
                            setShowUserEditForm(true);
                          }}
                        >
                          ערוך
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'deliveries' && (
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
                    deliveries={Object.entries(deliveryTasks)
                      .filter(([_, data]) =>
                        ['pending_acceptance', 'broadcast', 'accepted', 'picked'].includes(data.status)
                      )
                      .map(([id, data]) => ({ id, ...data }))}
                    loading={loading}
                    businesses={businesses}
                    couriers={couriers}
                    showBusinessColumn={true}
                    showCourierColumn={true}
                    userRole="admin"
                  />
                </div>

                <div className="deliveries-tabs">
                  <h3>היסטוריית משלוחים</h3>
                  <DeliveryHistoryTable
                    deliveries={Object.entries(deliveryTasks)
                      .filter(([_, data]) =>
                        ['delivered', 'cancelled', 'issue_reported'].includes(data.status)
                      )
                      .map(([id, data]) => ({ id, ...data }))}
                    loading={loading}
                    businesses={businesses}
                    couriers={couriers}
                    showBusinessColumn={true}
                    showCourierColumn={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modals for adding new entities */}
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

          {/* Client form modal removed - clients are created automatically during delivery creation */}

          <Modal isOpen={showDeliveryForm} onClose={() => setShowDeliveryForm(false)}>
            <DeliveryForm
              onClose={() => setShowDeliveryForm(false)}
              onSuccess={() => setShowDeliveryForm(false)}
              businessId={null}
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
      )}
    </div>
  );
}

export default AdminDashboard;
