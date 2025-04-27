import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, set } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { geocodeAddress } from '../../services/geocodingService';
import { getAddressSuggestions, getPlaceDetails } from '../../services/addressAutocompleteService';
import { uploadLogo } from '../../services/storageService';
import './Forms.css';

const DeliveryCompanyForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyContactName: '',
    companyContactPhone: '',
    companyEmail: '',
    password: '',
    confirmPassword: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [coordinates, setCoordinates] = useState({ latitude: 0, longitude: 0 });
  const suggestionsRef = useRef(null);
  const { currentUser } = useAuth();

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
    if (name === 'companyAddress' && coordinates.latitude !== 0) {
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
          companyAddress: suggestion.value || suggestion.label
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
    if (!formData.companyName) return 'שם חברה הוא שדה חובה';
    if (!formData.companyContactName) return 'שם איש קשר הוא שדה חובה';
    if (!formData.companyContactPhone) return 'טלפון הוא שדה חובה';
    if (!formData.companyEmail) return 'אימייל הוא שדה חובה';
    if (!formData.password) return 'סיסמה היא שדה חובה';
    if (formData.password !== formData.confirmPassword) return 'הסיסמאות אינן תואמות';
    if (formData.password.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים';

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.companyEmail)) return 'אימייל לא תקין';

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

      // 1. Create user account for the company admin
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.companyEmail,
        formData.password
      );

      const userId = userCredential.user.uid;

      // 2. Create the delivery company entry
      const companyRef = ref(db, `deliveryCompanies/${userId}`);

      // Convert logo to Base64 if provided
      let logoUrl = null;
      if (logoFile) {
        try {
          console.log('Converting logo to Base64:', logoFile.name, 'for company ID:', userId);

          // Check if the file is too large (limit to 2MB for Base64 storage in DB)
          const fileSizeMB = logoFile.size / (1024 * 1024);
          console.log('File size:', fileSizeMB.toFixed(2), 'MB');

          if (fileSizeMB > 2) {
            throw new Error('הקובץ גדול מדי. הגבלה היא 2MB');
          }

          logoUrl = await uploadLogo(logoFile, 'deliveryCompany', userId);
          console.log('Logo converted to Base64 successfully');
        } catch (error) {
          console.error('Error converting logo to Base64:', error);
          setError(`שגיאה בהמרת הלוגו: ${error.message || 'אירעה שגיאה לא ידועה'}`);
          // Continue without logo if conversion fails
        }
      }

      // Use stored coordinates if available, otherwise don't store coordinates
      let companyData = {
        companyName: formData.companyName,
        companyAddress: formData.companyAddress || '',
        companyContactName: formData.companyContactName,
        companyContactPhone: formData.companyContactPhone,
        companyEmail: formData.companyEmail,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        logoUrl: logoUrl
      };

      // Add coordinates if available
      if (coordinates.latitude !== 0 && coordinates.longitude !== 0) {
        companyData.companyLatitude = coordinates.latitude;
        companyData.companyLongitude = coordinates.longitude;
      }

      await set(companyRef, companyData);

      // 3. Create user entry with admin role
      const userRef = ref(db, `users/${userId}`);
      await set(userRef, {
        displayName: formData.companyContactName,
        email: formData.companyEmail,
        roles: {
          admin: true
        },
        deliveryCompanyId: userId // The company ID is the same as the user ID
      });

      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (error) {
      console.error('Error creating delivery company:', error);
      setError(error.message || 'אירעה שגיאה בעת יצירת חברת המשלוחים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>הוספת חברת משלוחים חדשה</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="companyName">שם החברה *</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="companyAddress">כתובת החברה</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              id="companyAddress"
              name="companyAddress"
              value={formData.companyAddress}
              onChange={handleAddressInputChange}
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
          <label htmlFor="logo">לוגו החברה</label>
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
          <label htmlFor="companyContactName">שם איש קשר *</label>
          <input
            type="text"
            id="companyContactName"
            name="companyContactName"
            value={formData.companyContactName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="companyContactPhone">טלפון *</label>
          <input
            type="tel"
            id="companyContactPhone"
            name="companyContactPhone"
            value={formData.companyContactPhone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="companyEmail">אימייל (ישמש להתחברות) *</label>
          <input
            type="email"
            id="companyEmail"
            name="companyEmail"
            value={formData.companyEmail}
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

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'מוסיף...' : 'הוסף חברה'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryCompanyForm;
