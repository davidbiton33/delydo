import React from 'react';
import './Switch.css';

const Switch = ({ isOn, handleToggle, labelText, onText = 'פעיל', offText = 'לא פעיל' }) => {
  return (
    <div className="switch-container">
      {labelText && <span className="switch-label">{labelText}</span>}
      <label className="switch">
        <input
          type="checkbox"
          checked={isOn}
          onChange={handleToggle}
        />
        <span className="slider"></span>
      </label>
      <span className={`status-text ${isOn ? 'status-active' : 'status-inactive'}`}>
        {isOn ? onText : offText}
      </span>
    </div>
  );
};

export default Switch;
