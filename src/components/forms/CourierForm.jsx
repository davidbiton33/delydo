import React, { useState, useEffect } from 'react';
import { getDatabase, ref, push, set, get } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import './Forms.css';

const CourierForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    curierName: '',
    curierPhone: '',
    email: '',
    password: '',
    confirmPassword: '',
    deliveryCompanyId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deliveryCompanies, setDeliveryCompanies] = useState({});
  const { currentUser, userType, deliveryCompanyId, isSuperAdmin } = useAuth();

  // Load delivery companies for super admin
  useEffect(() => {
    if (isSuperAdmin) {
      const fetchDeliveryCompanies = async () => {
        try {
          const db = getDatabase();
          const companiesRef = ref(db, 'deliveryCompanies');
          const snapshot = await get(companiesRef);
          
          if (snapshot.exists()) {
            setDeliveryCompanies(snapshot.val());
          }
        } catch (error) {
          console.error('Error fetching delivery companies:', error);
          setError('אירעה שגיאה בטעינת חברות המשלוחים');
        }
      };
      
      fetchDeliveryCompanies();
    } else if (userType === 'admin') {
      // For company admin, set the delivery company ID automatically
      setFormData(prevState => ({
        ...prevState,
        deliveryCompanyId: deliveryCompanyId
      }));
    }
  }, [isSuperAdmin, userType, deliveryCompanyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.curierName) return 'שם השליח הוא שדה חובה';
    if (!formData.curierPhone) return 'טלפון הוא שדה חובה';
    if (!formData.email) return 'אימייל הוא שדה חובה';
    if (!formData.password) return 'סיסמה היא שדה חובה';
    if (formData.password !== formData.confirmPassword) return 'הסיסמאות אינן תואמות';
    if (formData.password.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    if (isSuperAdmin && !formData.deliveryCompanyId) return 'יש לבחור חברת משלוחים';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'אימייל לא תקין';
    
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
      
      // 1. Create user account for the courier
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const userId = userCredential.user.uid;
      
      // 2. Create the courier entry
      const courierRef = ref(db, `curiers/${userId}`);
      await set(courierRef, {
        curierName: formData.curierName,
        curierPhone: formData.curierPhone,
        curierLatitude: 0,
        curierLongitude: 0,
        status: true,
        liveStatus: 'available',
        deliveryCompanyId: formData.deliveryCompanyId,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid
      });
      
      // 3. Create user entry with courier role
      const userRef = ref(db, `users/${userId}`);
      await set(userRef, {
        displayName: formData.curierName,
        email: formData.email,
        roles: {
          courier: true
        },
        deliveryCompanyId: formData.deliveryCompanyId,
        courierId: userId // The courier ID is the same as the user ID
      });
      
      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      
    } catch (error) {
      console.error('Error creating courier:', error);
      setError(error.message || 'אירעה שגיאה בעת יצירת השליח');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>הוספת שליח חדש</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="curierName">שם השליח *</label>
          <input
            type="text"
            id="curierName"
            name="curierName"
            value={formData.curierName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="curierPhone">טלפון *</label>
          <input
            type="tel"
            id="curierPhone"
            name="curierPhone"
            value={formData.curierPhone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">אימייל (ישמש להתחברות) *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">סיסמה *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">אימות סיסמה *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        
        {isSuperAdmin && (
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
        
        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'מוסיף...' : 'הוסף שליח'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourierForm;
