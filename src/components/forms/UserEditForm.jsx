import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get, update } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import './Forms.css';

const UserEditForm = ({ userId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    roles: {},
    deliveryCompanyId: '',
    businessId: '',
    courierId: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryCompanies, setDeliveryCompanies] = useState({});
  const [businesses, setBusinesses] = useState({});
  const { isSuperAdmin, isAdmin, deliveryCompanyId: currentUserCompanyId } = useAuth();

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const db = getDatabase();
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          setFormData({
            displayName: userData.displayName || '',
            email: userData.email || '',
            roles: userData.roles || {},
            deliveryCompanyId: userData.deliveryCompanyId || '',
            businessId: userData.businessId || '',
            courierId: userData.courierId || ''
          });
        } else {
          setError('משתמש לא נמצא');
        }

        // Fetch delivery companies if superAdmin
        if (isSuperAdmin) {
          const companiesRef = ref(db, 'deliveryCompanies');
          const companiesSnapshot = await get(companiesRef);
          if (companiesSnapshot.exists()) {
            setDeliveryCompanies(companiesSnapshot.val());
          }
        }

        // Fetch businesses if superAdmin or admin
        if (isSuperAdmin || isAdmin) {
          let businessesRef;
          if (isSuperAdmin) {
            businessesRef = ref(db, 'businesses');
          } else {
            // For admin, only fetch businesses in their company
            businessesRef = ref(db, 'businesses');
            // We'll filter the results after fetching
          }

          const businessesSnapshot = await get(businessesRef);
          if (businessesSnapshot.exists()) {
            const allBusinesses = businessesSnapshot.val();
            
            // Filter businesses by company ID if admin
            if (isAdmin && currentUserCompanyId) {
              const filteredBusinesses = {};
              Object.entries(allBusinesses).forEach(([id, business]) => {
                if (business.deliveryCompanyId === currentUserCompanyId) {
                  filteredBusinesses[id] = business;
                }
              });
              setBusinesses(filteredBusinesses);
            } else {
              setBusinesses(allBusinesses);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('שגיאה בטעינת נתוני המשתמש');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, isSuperAdmin, isAdmin, currentUserCompanyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleRoleChange = (role, checked) => {
    setFormData(prevState => ({
      ...prevState,
      roles: {
        ...prevState.roles,
        [role]: checked
      }
    }));
  };

  const validateForm = () => {
    if (!formData.displayName) return 'שם תצוגה הוא שדה חובה';
    
    // If user is a business, they must have a business ID
    if (formData.roles.business && !formData.businessId) return 'יש לבחור עסק';
    
    // If user is a courier, they must have a courier ID
    if (formData.roles.courier && !formData.courierId) return 'יש לבחור שליח';
    
    // If user is an admin, they must have a delivery company ID
    if (formData.roles.admin && !formData.deliveryCompanyId) return 'יש לבחור חברת משלוחים';
    
    // If superAdmin is editing, make sure a delivery company is selected for business/courier/admin
    if (isSuperAdmin) {
      if ((formData.roles.business || formData.roles.courier || formData.roles.admin) && !formData.deliveryCompanyId) {
        return 'יש לבחור חברת משלוחים';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${userId}`);

      // Update user data
      await update(userRef, {
        displayName: formData.displayName,
        roles: formData.roles,
        deliveryCompanyId: formData.deliveryCompanyId || null,
        businessId: formData.businessId || null,
        courierId: formData.courierId || null
      });

      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.message || 'אירעה שגיאה בעת עדכון המשתמש');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="form-container"><p>טוען נתונים...</p></div>;
  }

  return (
    <div className="form-container">
      <h2>עריכת משתמש</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName">שם תצוגה *</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">אימייל (לא ניתן לשינוי)</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            disabled
          />
        </div>

        <div className="form-group">
          <label>תפקידים</label>
          <div className="checkbox-group">
            {!formData.roles.superAdmin && (
              <>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="role-business"
                    checked={!!formData.roles.business}
                    onChange={(e) => handleRoleChange('business', e.target.checked)}
                  />
                  <label htmlFor="role-business">עסק</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="role-courier"
                    checked={!!formData.roles.courier}
                    onChange={(e) => handleRoleChange('courier', e.target.checked)}
                  />
                  <label htmlFor="role-courier">שליח</label>
                </div>
                {isSuperAdmin && (
                  <div className="checkbox-item">
                    <input
                      type="checkbox"
                      id="role-admin"
                      checked={!!formData.roles.admin}
                      onChange={(e) => handleRoleChange('admin', e.target.checked)}
                    />
                    <label htmlFor="role-admin">מנהל מערכת</label>
                  </div>
                )}
              </>
            )}
            {formData.roles.superAdmin && (
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="role-superadmin"
                  checked={true}
                  disabled
                />
                <label htmlFor="role-superadmin">מנהל מערכת עליון</label>
              </div>
            )}
          </div>
        </div>

        {isSuperAdmin && (formData.roles.business || formData.roles.courier || formData.roles.admin) && (
          <div className="form-group">
            <label htmlFor="deliveryCompanyId">חברת משלוחים *</label>
            <select
              id="deliveryCompanyId"
              name="deliveryCompanyId"
              value={formData.deliveryCompanyId}
              onChange={handleChange}
              required
            >
              <option value="">בחר חברת משלוחים</option>
              {Object.entries(deliveryCompanies).map(([id, company]) => (
                <option key={id} value={id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.roles.business && (
          <div className="form-group">
            <label htmlFor="businessId">עסק *</label>
            <select
              id="businessId"
              name="businessId"
              value={formData.businessId}
              onChange={handleChange}
              required
            >
              <option value="">בחר עסק</option>
              {Object.entries(businesses)
                .filter(([_, business]) => !formData.deliveryCompanyId || business.deliveryCompanyId === formData.deliveryCompanyId)
                .map(([id, business]) => (
                  <option key={id} value={id}>
                    {business.businessName}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'מעדכן...' : 'עדכן משתמש'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEditForm;
