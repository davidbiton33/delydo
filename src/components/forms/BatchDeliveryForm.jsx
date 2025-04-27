import { useState, useEffect } from 'react';
import { getDatabase, ref, push, set, get } from 'firebase/database';
import { useAuth } from '../../context/AuthContext';
import { fetchBusinessById } from '../../services/firebaseService';
import './DeliveryForm.css';

const BatchDeliveryForm = ({ onClose, onSuccess, businessId, deliveryCompanyId }) => {
  const { currentUser } = useAuth();
  const [deliveries, setDeliveries] = useState([
    {
      customerName: '',
      phoneNumber: '',
      deliveryAddress: '',
      notes: '',
      priority: 'normal',
      paymentMethod: 'cash'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businessDeliveryCompanyId, setBusinessDeliveryCompanyId] = useState(deliveryCompanyId);

  useEffect(() => {
    const loadBusiness = async () => {
      if (businessId) {
        try {
          const businessData = await fetchBusinessById(businessId);
          setBusiness(businessData);
          if (!deliveryCompanyId && businessData.deliveryCompanyId) {
            setBusinessDeliveryCompanyId(businessData.deliveryCompanyId);
          }
        } catch (error) {
          console.error('Error loading business:', error);
          setError('שגיאה בטעינת פרטי העסק');
        }
      }
    };

    loadBusiness();
  }, [businessId, deliveryCompanyId]);

  const handleChange = (index, e) => {
    const { name, value } = e.target;
    const updatedDeliveries = [...deliveries];
    updatedDeliveries[index] = {
      ...updatedDeliveries[index],
      [name]: value
    };
    setDeliveries(updatedDeliveries);
  };

  const addDelivery = () => {
    setDeliveries([
      ...deliveries,
      {
        customerName: '',
        phoneNumber: '',
        deliveryAddress: '',
        notes: '',
        priority: 'normal',
        paymentMethod: 'cash'
      }
    ]);
  };

  const removeDelivery = (index) => {
    if (deliveries.length > 1) {
      const updatedDeliveries = deliveries.filter((_, i) => i !== index);
      setDeliveries(updatedDeliveries);
    }
  };

  const validateForm = () => {
    for (let i = 0; i < deliveries.length; i++) {
      const delivery = deliveries[i];
      if (!delivery.customerName) return `משלוח ${i + 1}: שם לקוח הוא שדה חובה`;
      if (!delivery.phoneNumber) return `משלוח ${i + 1}: מספר טלפון הוא שדה חובה`;
      if (!delivery.deliveryAddress) return `משלוח ${i + 1}: כתובת היא שדה חובה`;
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

      // Get business data to check city
      const businessRef = ref(db, `businesses/${businessId}`);
      const businessSnapshot = await get(businessRef);

      if (!businessSnapshot.exists()) {
        throw new Error('העסק לא נמצא');
      }

      const businessData = businessSnapshot.val();

      // Get the next delivery number from the counter
      const counterRef = ref(db, 'counters/deliveryNumber');
      const counterSnapshot = await get(counterRef);

      // Get current counter value or start at 1 if it doesn't exist
      let counterValue = 1;
      if (counterSnapshot.exists()) {
        counterValue = counterSnapshot.val();
      }

      // Create all deliveries
      for (const delivery of deliveries) {
        // Check if the address contains the business city
        if (businessData.businessCity && !delivery.deliveryAddress.includes(businessData.businessCity)) {
          setError(`לא ניתן ליצור משלוח מחוץ לעיר ${businessData.businessCity}`);
          setLoading(false);
          return;
        }

        // Increment the counter value
        counterValue++;

        // Create a formatted delivery number with date prefix and padding
        const today = new Date();
        const year = today.getFullYear().toString().slice(2); // Get last 2 digits of year
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');

        // Format: YYMMDD-XXXXX (e.g., 240520-00123)
        const deliveryNumber = `${year}${month}${day}-${counterValue.toString().padStart(5, '0')}`;

        // Create the delivery task
        const tasksRef = ref(db, 'deliveryTasks');
        const newTaskRef = push(tasksRef);

        const now = new Date().toISOString();

        await set(newTaskRef, {
          customerName: delivery.customerName,
          phoneNumber: delivery.phoneNumber,
          deliveryAddress: delivery.deliveryAddress,
          notes: delivery.notes || '',
          priority: delivery.priority,
          paymentMethod: delivery.paymentMethod,
          businessId: businessId,
          deliveryCompanyId: businessDeliveryCompanyId,
          status: 'pending',
          createdAt: now,
          createdBy: currentUser.uid,
          deliveryNumber: deliveryNumber,
          statusTimestamps: {
            pending: now
          }
        });
      }

      // Update the counter
      await set(counterRef, counterValue);

      // Success
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating deliveries:', error);
      setError(error.message || 'שגיאה ביצירת המשלוחים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="delivery-form-container">
      <h2>יצירת משלוחים מרובים</h2>
      {business && (
        <div className="selected-business">
          <h3>עסק: {business.businessName}</h3>
          <p>כתובת: {business.businessAddress}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {deliveries.map((delivery, index) => (
          <div key={index} className="delivery-item">
            <h3>משלוח {index + 1}</h3>
            <div className="form-group">
              <label htmlFor={`customerName-${index}`}>שם לקוח *</label>
              <input
                type="text"
                id={`customerName-${index}`}
                name="customerName"
                value={delivery.customerName}
                onChange={(e) => handleChange(index, e)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`phoneNumber-${index}`}>טלפון לקוח *</label>
              <input
                type="tel"
                id={`phoneNumber-${index}`}
                name="phoneNumber"
                value={delivery.phoneNumber}
                onChange={(e) => handleChange(index, e)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`deliveryAddress-${index}`}>כתובת למשלוח *</label>
              <input
                type="text"
                id={`deliveryAddress-${index}`}
                name="deliveryAddress"
                value={delivery.deliveryAddress}
                onChange={(e) => handleChange(index, e)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`notes-${index}`}>הערות</label>
              <textarea
                id={`notes-${index}`}
                name="notes"
                value={delivery.notes}
                onChange={(e) => handleChange(index, e)}
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`priority-${index}`}>עדיפות</label>
                <select
                  id={`priority-${index}`}
                  name="priority"
                  value={delivery.priority}
                  onChange={(e) => handleChange(index, e)}
                >
                  <option value="normal">רגילה</option>
                  <option value="high">גבוהה</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor={`paymentMethod-${index}`}>אמצעי תשלום</label>
                <select
                  id={`paymentMethod-${index}`}
                  name="paymentMethod"
                  value={delivery.paymentMethod}
                  onChange={(e) => handleChange(index, e)}
                >
                  <option value="cash">מזומן</option>
                  <option value="credit">אשראי</option>
                </select>
              </div>
            </div>

            {deliveries.length > 1 && (
              <button
                type="button"
                className="remove-delivery-btn"
                onClick={() => removeDelivery(index)}
              >
                הסר משלוח
              </button>
            )}

            <hr />
          </div>
        ))}

        <button
          type="button"
          className="add-delivery-btn"
          onClick={addDelivery}
        >
          הוסף משלוח נוסף
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'מעבד...' : 'צור משלוחים'}
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default BatchDeliveryForm;
