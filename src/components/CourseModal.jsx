import React from 'react';
import '../styles/CourseModal.css';

// Helper function to generate placeholder logo with initials
function getLogoPlaceholder(institutionName) {
  const initials = institutionName
    .split(' ')
    .filter(word => word.length > 0)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');

  return initials || 'ED';
}

// Helper function to get consistent color for initials based on name hash
function getLogoColor(institutionName) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#6C5B7B'
  ];

  let hash = 0;
  for (let i = 0; i < institutionName.length; i++) {
    hash = ((hash << 5) - hash) + institutionName.charCodeAt(i);
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

export function CourseModal({ course, institution, isOpen, onClose }) {
  if (!isOpen) return null;

  const [logoError, setLogoError] = React.useState(false);
  const displayPrice = course.tuitionFee || course.totalCost;
  const logoInitials = getLogoPlaceholder(institution.name);
  const logoColor = getLogoColor(institution.name);

  // Helper: ensure URL has protocol
  const getValidUrl = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const validWebsite = getValidUrl(institution.website);

  // Get all locations
  const getAllLocations = () => {
    if (!course.locations) return [];
    const allLocs = [];
    Object.entries(course.locations).forEach(([state, locs]) => {
      locs.forEach(loc => {
        allLocs.push({
          ...loc,
          state
        });
      });
    });
    return allLocs;
  };

  const locations = getAllLocations();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header with Logo, Title, and Price */}
        <div className="modal-header">
          <div className="modal-header-container">
            {/* Logo + Title Section */}
            <div className="modal-header-left">
              <div className="modal-logo-placeholder" style={logoError || !institution.logoUrl ? { backgroundColor: logoColor } : {}}>
                {institution.logoUrl && !logoError ? (
                  <img
                    src={institution.logoUrl}
                    alt={institution.name}
                    className="modal-logo-img"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="modal-logo-initials">{logoInitials}</span>
                )}
              </div>
              <div className="modal-header-info">
                <div className="modal-title-with-course-code">
                  <h1 className="modal-title">{course.courseName}</h1>
                  <span className="cricos-separator">|</span>
                  <span className="modal-course-code">C: {course.courseCode}</span>
                </div>
                <div className="modal-institution-with-code">
                  <p className="modal-institution-name">
                    {institution.name}
                  </p>
                  <span className="cricos-separator">|</span>
                  <span className="modal-provider-code">P: {institution.providerCode}</span>
                </div>
                {institution.registeredName && (
                  <p className="modal-registered-name">
                    ({institution.registeredName})
                  </p>
                )}
              </div>
            </div>

            {/* Price Section */}
            <div className="modal-header-right">
              {displayPrice ? (
                <div className="modal-header-price">
                  <div className="price-currency">AUD</div>
                  <div className="price-amount">${displayPrice.toLocaleString()}</div>
                  <div className="price-period">Per Course</div>
                </div>
              ) : (
                <div className="modal-header-price">
                  <div className="price-amount">TBA</div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Course Description */}
          {course.description && (
            <div className="modal-section">
              <h3 className="section-label">Course Overview</h3>
              <div className="course-description">
                {course.description}
              </div>
            </div>
          )}

          {/* Course Details */}
          <div className="modal-section">
            <h3 className="section-label">Course Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Level:</span>
                <span className="detail-value">{course.courseLevel || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">
                  {course.durationWeeks
                    ? `${course.durationWeeks} weeks (${course.durationWeeks < 26 ? 'Part-Time' : 'Full-Time'})`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Field of Study:</span>
                <span className="detail-value">{course.fieldOfEducation || 'N/A'}</span>
              </div>
              {course.hasWorkComponent && (
                <div className="detail-item highlight">
                  <span className="detail-label">Work Component:</span>
                  <span className="detail-value">✓ Included</span>
                </div>
              )}
              {course.isFoundationStudies && (
                <div className="detail-item highlight">
                  <span className="detail-label">Foundation Studies:</span>
                  <span className="detail-value">✓ Included</span>
                </div>
              )}
            </div>
          </div>

          {/* Locations */}
          {locations.length > 0 && (
            <div className="modal-section">
              <h3 className="section-label">Available Locations</h3>
              <div className="locations-list">
                {locations.map((loc, idx) => (
                  <div key={idx} className="location-card">
                    <div className="location-name">{loc.locationName}</div>
                    <div className="location-city">
                      {loc.city}, {loc.state}, Australia
                    </div>
                    {loc.address && (
                      <div className="location-address">{loc.address}</div>
                    )}
                    {loc.postcode && (
                      <div className="location-postcode">Postcode: {loc.postcode}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="modal-footer">
          <button className="modal-btn close-btn" onClick={onClose}>
            Close
          </button>
          <div className="modal-actions">
            <button className="modal-btn wishlist-btn" aria-label="Add to wishlist">
              ♡
            </button>
            <button
              className="modal-btn enquire-btn"
              onClick={() => console.log('Enquire clicked')}
            >
              Enquire
            </button>
            <button
              className="modal-btn apply-btn"
              onClick={() => institution.website && window.open(institution.website, '_blank', 'noopener,noreferrer')}
            >
              Apply
            </button>
            {validWebsite ? (
              <a
                href={validWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-btn website-btn"
              >
                Visit Website ↗
              </a>
            ) : (
              <button
                className="modal-btn website-btn disabled"
                disabled
                title="Website not available"
              >
                Visit Website ↗
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
