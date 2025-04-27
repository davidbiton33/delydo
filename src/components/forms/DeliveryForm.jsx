import React, { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { geocodeAddress } from '../../services/geocodingService';
import { getAddressSuggestions, getPlaceDetails } from '../../services/addressAutocompleteService';
import './Forms.css';

const DeliveryForm = ({ onClose, onSuccess, businessId: propBusinessId }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    deliveryAddress: '',
    notes: '',
    priority: 'regular',
    paymentMethod: 'cash',
    businessId: propBusinessId || '',
    deliveryCompanyId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [businesses, setBusinesses] = useState({});
  const [selectedClient, setSelectedClient] = useState('');
  const [deliveryCompanies, setDeliveryCompanies] = useState({});
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [coordinates, setCoordinates] = useState({ latitude: 0, longitude: 0 });
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const { currentUser, userType, userId, deliveryCompanyId, isSuperAdmin, isAdmin } = useAuth();

  // Load delivery companies for superAdmin
  useEffect(() => {
    if (isSuperAdmin && !propBusinessId) {
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
    } else if (isAdmin && !isSuperAdmin) {
      // For delivery company admin, set the delivery company ID automatically
      setFormData(prevState => ({
        ...prevState,
        deliveryCompanyId: deliveryCompanyId
      }));
    }
  }, [isSuperAdmin, isAdmin, deliveryCompanyId, propBusinessId]);

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

            // Filter businesses by delivery company ID
            if (isAdmin && !isSuperAdmin) {
              // For admin users, filter by their delivery company ID
              Object.entries(allBusinesses).forEach(([id, business]) => {
                if (business.deliveryCompanyId === deliveryCompanyId) {
                  filteredBusinesses[id] = business;
                }
              });
            } else if (isSuperAdmin && formData.deliveryCompanyId) {
              // For superAdmin, filter by selected delivery company if one is selected
              Object.entries(allBusinesses).forEach(([id, business]) => {
                if (business.deliveryCompanyId === formData.deliveryCompanyId) {
                  filteredBusinesses[id] = business;
                }
              });
            } else if (isSuperAdmin) {
              // If no delivery company is selected, show all businesses
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
  }, [isAdmin, isSuperAdmin, userType, userId, deliveryCompanyId, propBusinessId, formData.deliveryCompanyId]);

  // No need to load clients list anymore - we'll search by phone number directly

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If delivery company is changed, reset business selection
    if (name === 'deliveryCompanyId' && isSuperAdmin) {
      setFormData(prevState => ({
        ...prevState,
        [name]: value,
        businessId: '' // Reset business selection when delivery company changes
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }

    // If phone number is changed, search for client
    if (name === 'phoneNumber' && value.length >= 9) {
      searchClientByPhone(value);
    }
  };

  // Function to search for client by phone number
  const searchClientByPhone = async (phoneNumber) => {
    try {
      const db = getDatabase();
      const clientsRef = ref(db, 'businessClients');
      const clientQuery = query(clientsRef, orderByChild('clientPhone'), equalTo(phoneNumber));

      const snapshot = await get(clientQuery);
      if (snapshot.exists()) {
        // Get all clients that match the phone number
        const clientsData = snapshot.val();

        // Find the client that belongs to the current business
        const matchingClient = Object.entries(clientsData).find(([_, client]) =>
          client.businessId === formData.businessId
        );

        if (matchingClient) {
          const [clientId, clientData] = matchingClient;
          // Update form with client data
          setFormData(prevData => ({
            ...prevData,
            customerName: clientData.clientName,
            deliveryAddress: clientData.clientAddress,
            // Keep other form fields as they are
          }));

          // Set the selected client
          setSelectedClient(clientId);
        }
      }
    } catch (error) {
      console.error('Error searching for client:', error);
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
          deliveryAddress: suggestion.value || suggestion.label
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  const validateForm = () => {
    if (!formData.customerName) return 'שם הלקוח הוא שדה חובה';
    if (!formData.phoneNumber) return 'טלפון הוא שדה חובה';
    if (!formData.deliveryAddress) return 'כתובת היא שדה חובה';
    if (!formData.businessId) return 'יש לבחור עסק';
    if (isSuperAdmin && !formData.deliveryCompanyId) return 'יש לבחור חברת משלוחים';

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

      // Get business data to check city
      const businessRef = ref(db, `businesses/${formData.businessId}`);
      const businessSnapshot = await get(businessRef);

      if (!businessSnapshot.exists()) {
        throw new Error('העסק לא נמצא');
      }

      const businessData = businessSnapshot.val();

      // Check if the address contains the business city
      // This is a simple check - in a real app, you might want to use geocoding to verify the city
      if (businessData.businessCity && !formData.deliveryAddress.includes(businessData.businessCity)) {
        setError(`לא ניתן ליצור משלוח מחוץ לעיר ${businessData.businessCity}`);
        setLoading(false);
        return;
      }

      // Get the delivery company ID
      let businessDeliveryCompanyId;

      if (isSuperAdmin) {
        // For superAdmin, use the selected delivery company ID
        businessDeliveryCompanyId = formData.deliveryCompanyId;
      } else if (isAdmin) {
        // For delivery company admin, use their delivery company ID
        businessDeliveryCompanyId = deliveryCompanyId;
      } else {
        // For business users or when no delivery company ID is available
        // Get the delivery company ID from the business
        const businessRef = ref(db, `businesses/${formData.businessId}`);
        const businessSnapshot = await get(businessRef);

        if (businessSnapshot.exists()) {
          const businessData = businessSnapshot.val();
          businessDeliveryCompanyId = businessData.deliveryCompanyId;
        }
      }

      // Check if the client exists, if not create a new client
      let clientId = selectedClient;

      if (!clientId && formData.customerName && formData.phoneNumber && formData.deliveryAddress) {
        // Use stored coordinates if available, otherwise geocode the address
        let addressCoordinates = coordinates;
        if (addressCoordinates.latitude === 0 && addressCoordinates.longitude === 0) {
          addressCoordinates = await geocodeAddress(formData.deliveryAddress);
        }

        // Create a new client
        const clientsRef = ref(db, 'businessClients');
        const newClientRef = push(clientsRef);

        await set(newClientRef, {
          clientName: formData.customerName,
          clientPhone: formData.phoneNumber,
          clientAddress: formData.deliveryAddress,
          clientLatitude: addressCoordinates.latitude,
          clientLongitude: addressCoordinates.longitude,
          businessId: formData.businessId,
          notes: formData.notes || '',
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
          coordinatesUpdatedAt: new Date().toISOString()
        });

        clientId = newClientRef.key;
      }

      // Get the next delivery number from the counter
      const counterRef = ref(db, 'counters/deliveryNumber');
      const counterSnapshot = await get(counterRef);

      // Get current counter value or start at 1 if it doesn't exist
      let counterValue = 1;
      if (counterSnapshot.exists()) {
        counterValue = counterSnapshot.val() + 1;
      }

      // Create a formatted delivery number with date prefix and padding
      const today = new Date();
      const year = today.getFullYear().toString().slice(2); // Get last 2 digits of year
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      // Format: YYMMDD-XXXXX (e.g., 240520-00123)
      const deliveryNumber = `${year}${month}${day}-${counterValue.toString().padStart(5, '0')}`;

      // Update the counter
      await set(counterRef, counterValue);

      // Create the delivery task
      const tasksRef = ref(db, 'deliveryTasks');
      const newTaskRef = push(tasksRef);

      const now = new Date().toISOString();

      await set(newTaskRef, {
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        deliveryAddress: formData.deliveryAddress,
        notes: formData.notes || '',
        priority: formData.priority,
        paymentMethod: formData.paymentMethod,
        businessId: formData.businessId,
        deliveryCompanyId: businessDeliveryCompanyId,
        status: 'pending',
        createdAt: now,
        createdBy: currentUser.uid,
        clientId: clientId || null,
        deliveryNumber: deliveryNumber, // Add the sequential delivery number
        statusTimestamps: {
          pending: now
        }
      });

      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (error) {
      console.error('Error creating delivery:', error);
      setError(error.message || 'אירעה שגיאה בעת יצירת המשלוח');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>יצירת משלוח חדש</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {isSuperAdmin && !propBusinessId && (
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
            <small className="form-hint">יש לבחור חברת משלוחים תחילה כדי לראות את העסקים השייכים לה</small>
          </div>
        )}

        {(isAdmin || isSuperAdmin) && !propBusinessId && (
          <div className="form-group">
            <label htmlFor="businessId">עסק *</label>
            <select
              id="businessId"
              name="businessId"
              value={formData.businessId}
              onChange={handleChange}
              required
              disabled={isSuperAdmin && !formData.deliveryCompanyId}
            >
              <option value="">{isSuperAdmin && !formData.deliveryCompanyId ? 'יש לבחור חברת משלוחים תחילה' : 'בחר עסק'}</option>
              {Object.entries(businesses).map(([id, business]) => (
                <option key={id} value={id}>
                  {business.businessName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="phoneNumber">טלפון *</label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            placeholder="הזן מספר טלפון"
            dir='rtl'
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerName">שם הלקוח *</label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
            placeholder="הזן שם לקוח"
          />
        </div>

        <div className="form-group">
          <label htmlFor="deliveryAddress">כתובת למשלוח *</label>
          <div className="autocomplete-container" style={{ position: 'relative' }}>
            <input
              type="text"
              id="deliveryAddress"
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleAddressInputChange}
              ref={addressInputRef}
              required
              placeholder="הזן כתובת למשלוח"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '8px',
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
          <label htmlFor="priority">עדיפות</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="regular">רגילה</option>
            <option value="high">דחופה</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="paymentMethod">אמצעי תשלום</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
          >
            <option value="cash">מזומן</option>
            <option value="credit">אשראי</option>
          </select>
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

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'יוצר משלוח...' : 'צור משלוח'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm;
