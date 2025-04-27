import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, set, get } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { geocodeAddress } from '../../services/geocodingService';
import { getAddressSuggestions, getPlaceDetails } from '../../services/addressAutocompleteService';
import { uploadLogo } from '../../services/storageService';
import './Forms.css';

const BusinessForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    businessAddress: '',
    businessCity: '',
    businessContactName: '',
    businessContactPhone: '',
    businessEmail: '',
    password: '',
    confirmPassword: '',
    deliveryCompanyId: '',
    courierInstructions: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deliveryCompanies, setDeliveryCompanies] = useState({});
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [coordinates, setCoordinates] = useState({ latitude: 0, longitude: 0 });
  const suggestionsRef = useRef(null);
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));

    // If changing the address field, reset coordinates
    if (name === 'businessAddress' && coordinates.latitude !== 0) {
      setCoordinates({ latitude: 0, longitude: 0 });
    }
  };

  // Function to handle address input change and fetch suggestions
  const handleAddressInputChange = async (e) => {
    const { name, value } = e.target;

    // Update form data with the input value
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));

    // If the input is empty, clear suggestions
    if (!value.trim()) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Only fetch suggestions if the input has at least 2 characters
    if (value.length >= 2) {
      try {
        setIsLoadingAddresses(true);
        setShowSuggestions(true); // Show loading indicator immediately

        // Fetch suggestions from API
        const suggestions = await getAddressSuggestions(value);

        // Update suggestions state if we got suggestions
        if (suggestions && suggestions.length > 0) {
          setAddressSuggestions(suggestions);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        setShowSuggestions(false);
      } finally {
        setIsLoadingAddresses(false);
      }
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Function to handle selection of an address suggestion
  const handleSelectAddress = (suggestion) => {
    try {
      console.log('Selected address:', suggestion);

      if (suggestion) {
        // Update form with the selected address
        setFormData(prevState => ({
          ...prevState,
          businessAddress: suggestion.value || suggestion.label
        }));

        // Store the coordinates
        if (suggestion.lat && suggestion.lon) {
          setCoordinates({
            latitude: suggestion.lat,
            longitude: suggestion.lon
          });
          console.log('Set coordinates:', suggestion.lat, suggestion.lon);
        }
      }

      // Hide suggestions
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error processing selected address:', error);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        setError('נא להעלות קובץ תמונה בלבד');
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('גודל הקובץ חייב להיות עד 2MB');
        return;
      }

      setLogoFile(file);

      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };



  const validateForm = () => {
    if (!formData.businessName) return 'שם העסק הוא שדה חובה';
    if (!formData.businessAddress) return 'כתובת העסק היא שדה חובה';
    if (!formData.businessCity) return 'עיר העסק היא שדה חובה';
    if (!formData.businessContactName) return 'שם איש קשר הוא שדה חובה';
    if (!formData.businessContactPhone) return 'טלפון הוא שדה חובה';
    if (!formData.businessEmail) return 'אימייל הוא שדה חובה';
    if (!formData.password) return 'סיסמה היא שדה חובה';
    if (formData.password !== formData.confirmPassword) return 'הסיסמאות אינן תואמות';
    if (formData.password.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    if (isSuperAdmin && !formData.deliveryCompanyId) return 'יש לבחור חברת משלוחים';

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.businessEmail)) return 'אימייל לא תקין';

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

      // Use stored coordinates if available, otherwise geocode the address
      let businessCoordinates = coordinates;
      if (businessCoordinates.latitude === 0 && businessCoordinates.longitude === 0) {
        businessCoordinates = await geocodeAddress(formData.businessAddress);
      }

      // 1. Create user account for the business
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.businessEmail,
        formData.password
      );

      const userId = userCredential.user.uid;

      // 2. Create the business entry
      const businessRef = ref(db, `businesses/${userId}`);

      // Convert logo to Base64 if provided
      let logoUrl = null;
      if (logoFile) {
        try {
          console.log('Converting logo to Base64:', logoFile.name, 'for business ID:', userId);

          // Check if the file is too large (limit to 2MB for Base64 storage in DB)
          const fileSizeMB = logoFile.size / (1024 * 1024);
          console.log('File size:', fileSizeMB.toFixed(2), 'MB');

          if (fileSizeMB > 2) {
            throw new Error('הקובץ גדול מדי. הגבלה היא 2MB');
          }

          logoUrl = await uploadLogo(logoFile, 'business', userId);
          console.log('Logo converted to Base64 successfully');
        } catch (error) {
          console.error('Error converting logo to Base64:', error);
          setError(`שגיאה בהמרת הלוגו: ${error.message || 'אירעה שגיאה לא ידועה'}`);
          // Continue without logo if conversion fails
        }
      }

      await set(businessRef, {
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        businessCity: formData.businessCity,
        businessContactName: formData.businessContactName,
        businessContactPhone: formData.businessContactPhone,
        email: formData.businessEmail,
        status: 'active',
        deliveryCompanyId: formData.deliveryCompanyId,
        businessLatitude: businessCoordinates.latitude,
        businessLongitude: businessCoordinates.longitude,
        courierInstructions: formData.courierInstructions || '',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        logoUrl: logoUrl
      });

      // 3. Create user entry with business role
      const userRef = ref(db, `users/${userId}`);
      await set(userRef, {
        displayName: formData.businessContactName,
        email: formData.businessEmail,
        roles: {
          business: true
        },
        deliveryCompanyId: formData.deliveryCompanyId,
        businessId: userId // The business ID is the same as the user ID
      });

      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (error) {
      console.error('Error creating business:', error);
      setError(error.message || 'אירעה שגיאה בעת יצירת העסק');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>הוספת עסק חדש</h2>

      {error && (
        <div className="error-message" style={{ whiteSpace: 'pre-line' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="businessName">שם העסק *</label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessAddress">כתובת העסק *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              id="businessAddress"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleAddressInputChange}
              required
              autoComplete="off"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                direction: 'rtl',
                textAlign: 'right'
              }}
            />

            {/* Suggestions list */}
            <div
              ref={suggestionsRef}
              style={{
                display: showSuggestions ? 'block' : 'none', // Toggle visibility
                position: 'absolute',
                top: '100%',
                right: 0,
                left: 0,
                zIndex: 9999,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                maxHeight: '250px',
                overflowY: 'auto',
                marginTop: '0',
                padding: '0',
                direction: 'rtl'
              }}
            >
              {isLoadingAddresses ? (
                <div style={{ padding: '10px', textAlign: 'center' }}>טוען כתובות...</div>
              ) : addressSuggestions.length === 0 ? (
                <div style={{ padding: '10px', textAlign: 'center' }}>לא נמצאו כתובות</div>
              ) : (
                addressSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectAddress(suggestion)}
                    style={{
                      padding: '10px 15px',
                      cursor: 'pointer',
                      borderBottom: index < addressSuggestions.length - 1 ? '1px solid #eee' : 'none',
                      backgroundColor: 'white',
                      color: '#333',
                      fontSize: '14px',
                      textAlign: 'right'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    {suggestion.label || suggestion.value || "כתובת ללא פרטים"}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="businessCity">עיר העסק *</label>
          <input
            type="text"
            id="businessCity"
            name="businessCity"
            value={formData.businessCity}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="logo">לוגו העסק</label>
          <div className="file-input-container" onClick={() => document.getElementById('logo').click()}>
            <div className="icon">🖼️</div>
            <div className="text">{logoFile ? `נבחר: ${logoFile.name}` : 'לחץ כאן להעלאת לוגו'}</div>
            <input
              type="file"
              id="logo"
              name="logo"
              accept="image/*"
              onChange={handleLogoChange}
              className="file-input"
              style={{ display: 'none' }}
            />
          </div>
          {logoPreview && (
            <div className="logo-preview">
              <img src={logoPreview} alt="Logo Preview" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="businessContactName">שם איש קשר *</label>
          <input
            type="text"
            id="businessContactName"
            name="businessContactName"
            value={formData.businessContactName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessContactPhone">טלפון *</label>
          <input
            type="tel"
            id="businessContactPhone"
            name="businessContactPhone"
            value={formData.businessContactPhone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessEmail">אימייל (ישמש להתחברות) *</label>
          <input
            type="email"
            id="businessEmail"
            name="businessEmail"
            value={formData.businessEmail}
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

        <div className="form-group">
          <label htmlFor="courierInstructions">הוראות הגעה לשליח</label>
          <textarea
            id="courierInstructions"
            name="courierInstructions"
            value={formData.courierInstructions}
            onChange={handleChange}
            rows={3}
            placeholder="הוראות הגעה לשליח (יוצגו לשליח כאשר הוא בדרך לעסק)"
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
            {loading ? 'מוסיף...' : 'הוסף עסק'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessForm;
