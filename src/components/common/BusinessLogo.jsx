import React from 'react';
import './Logo.css';

const BusinessLogo = ({ logoUrl, businessName, size = 'medium' }) => {
  // If no logo URL is provided, create an initial-based placeholder
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const initials = getInitials(businessName);

  return (
    <div className={`logo-container ${size}`}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={`${businessName} logo`} 
          className="logo-image"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className="logo-placeholder"
        style={{ display: logoUrl ? 'none' : 'flex' }}
      >
        {initials}
      </div>
    </div>
  );
};

export default BusinessLogo;
