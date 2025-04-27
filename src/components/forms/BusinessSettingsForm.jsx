import React, { useState } from 'react';
import './Forms.css'; // Assuming you have a Forms.css file for styling

function BusinessSettingsForm({ initialValues, onSubmit, onClose }) {
  const [formData, setFormData] = useState(initialValues || {
    address: '',
    contactPersonName: '',
    contactPersonPhone: '',
    deliveryInstructions: '',
    logo: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: name === 'logo' ? files[0] : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>הגדרות עסק</h2>
      <div className="form-group">
        <label htmlFor="address">כתובת:</label>
        <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="contactPersonName">שם איש קשר:</label>
        <input type="text" id="contactPersonName" name="contactPersonName" value={formData.contactPersonName} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="contactPersonPhone">טלפון איש קשר:</label>
        <input type="tel" id="contactPersonPhone" name="contactPersonPhone" value={formData.contactPersonPhone} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="deliveryInstructions">הוראות הגעה (אופציונלי):</label>
        <textarea id="deliveryInstructions" name="deliveryInstructions" value={formData.deliveryInstructions} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="logo">לוגו:</label>
        <input type="file" id="logo" name="logo" accept="image/*" onChange={handleChange} />
      </div>
      <div className="form-group form-buttons">
        <button type="submit" className="submit-button">שמור</button>
        <button type="button" className="cancel-button" onClick={onClose}>ביטול</button>
      </div>
    </form>
  );
}

export default BusinessSettingsForm;
