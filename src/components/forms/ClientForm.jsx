import React, { useState, useEffect } from 'react';
import { getDatabase, ref, push, set, get } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import './Forms.css';

const ClientForm = ({ onClose, onSuccess, businessId: propBusinessId }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    notes: '',
    businessId: propBusinessId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [businesses, setBusinesses] = useState({});
  const { currentUser, userType, userId, deliveryCompanyId, isSuperAdmin, isAdmin } = useAuth();

  // Load businesses for admin users
  useEffect(() => {
    if ((isAdmin || isSuperAdmin) && !propBusinessId) {
      const fetchBusinesses = async () => {
        try {
          const db = getDatabase();
          const businessesRef = ref(db, 'businesses');
          const snapshot = await get(businessesRef);
          
          if (snapshot.exists()) {
            const allBusinesses = snapshot.val();
            let filteredBusinesses = {};
            
            // Filter businesses by delivery company ID for admin users
            if (isAdmin && !isSuperAdmin) {
              Object.entries(allBusinesses).forEach(([id, business]) => {
                if (business.deliveryCompanyId === deliveryCompanyId) {
                  filteredBusinesses[id] = business;
                }
              });
            } else {
              filteredBusinesses = allBusinesses;
            }
            
            setBusinesses(filteredBusinesses);
          }
        } catch (error) {
          console.error('Error fetching businesses:', error);
          setError('אירעה שגיאה בטעינת העסקים');
        }
      };
      
      fetchBusinesses();
    } else if (userType === 'business') {
      // For business users, set the business ID automatically
      setFormData(prevState => ({
        ...prevState,
        businessId: userId
      }));
    }
  }, [isAdmin, isSuperAdmin, userType, userId, deliveryCompanyId, propBusinessId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.clientName) return 'שם הלקוח הוא שדה חובה';
    if (!formData.clientPhone) return 'טלפון הוא שדה חובה';
    if (!formData.clientAddress) return 'כתובת היא שדה חובה';
    if (!formData.businessId) return 'יש לבחור עסק';
    
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
      
      // Create the client entry
      const clientsRef = ref(db, 'businessClients');
      const newClientRef = push(clientsRef);
      
      await set(newClientRef, {
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientAddress: formData.clientAddress,
        clientLatitude: 0, // These would be set by a geocoding service in a real app
        clientLongitude: 0,
        businessId: formData.businessId,
        notes: formData.notes || '',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid
      });
      
      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
    } catch (error) {
      console.error('Error creating client:', error);
      setError(error.message || 'אירעה שגיאה בעת יצירת הלקוח');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>הוספת לקוח חדש</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="clientName">שם הלקוח *</label>
          <input
            type="text"
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="clientPhone">טלפון *</label>
          <input
            type="tel"
            id="clientPhone"
            name="clientPhone"
            value={formData.clientPhone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="clientAddress">כתובת *</label>
          <input
            type="text"
            id="clientAddress"
            name="clientAddress"
            value={formData.clientAddress}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="notes">הערות</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>
        
        {(isAdmin || isSuperAdmin) && !propBusinessId && (
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
              {Object.entries(businesses).map(([id, business]) => (
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
            {loading ? 'מוסיף...' : 'הוסף לקוח'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
