import React from 'react';
import '../styles/CourseCard.css';
import { getRegionalCategory, getRegionalCategoryBadge } from '../utils/regionalClassification';

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
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

export function CourseCard({ course, institution, onCardClick, isSelected, onToggleSelect, isAdmin = false, isInWishlist = false, onToggleWishlist }) {
  const [logoError, setLogoError] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    if (institution?.logoUrl && institution?.name?.includes('National')) {
      console.log(`CourseCard: ${institution.name} - logoUrl: ${institution.logoUrl}, logoError: ${logoError}`);
    }
  }, [institution, logoError]);

  const openWebsite = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const logoInitials = getLogoPlaceholder(institution.name);
  const logoColor = getLogoColor(institution.name);

  // Get all unique cities from course locations
  const getAllCities = () => {
    if (!course.locations || Object.keys(course.locations).length === 0) {
      return [];
    }

    const cities = new Set();
    Object.entries(course.locations).forEach(([, locations]) => {
      locations.forEach((loc) => {
        if (loc.city) cities.add(loc.city);
      });
    });
    return Array.from(cities).sort();
  };

  // Get first location for regional badge
  const getFirstLocation = () => {
    if (!course.locations || Object.keys(course.locations).length === 0) {
      return null;
    }

    const firstState = Object.keys(course.locations)[0];
    const firstLocation = course.locations[firstState][0];
    return firstLocation;
  };

  const allCities = getAllCities();
  const firstLocation = getFirstLocation();
  const displayPrice = course.tuitionFee || course.totalCost;

  // Get regional category for first location
  const getRegionalBadge = () => {
    if (!firstLocation || !firstLocation.postcode) return null;
    const category = getRegionalCategory(firstLocation.postcode, firstLocation.state);
    const badge = getRegionalCategoryBadge(category);
    return badge;
  };

  const regionalBadge = getRegionalBadge();

  // Get delivery method (only if special delivery method exists)
  const getDeliveryMethod = () => {
    const deliveryMethods = [];
    if (course.hasWorkComponent) deliveryMethods.push('Work Component');
    if (course.isFoundationStudies) deliveryMethods.push('Foundation Studies');
    return deliveryMethods.length > 0 ? deliveryMethods[0] : null;
  };

  return (
    <div className="course-card" onClick={() => onCardClick && onCardClick(course, institution)}>
      <div className="card-container">
        {/* Left: Logo (Real or Placeholder) */}
        <div className="logo-placeholder" style={logoError || !institution.logoUrl ? { backgroundColor: logoColor } : {}}>
          {institution.logoUrl && !logoError ? (
            <img
              src={institution.logoUrl}
              alt={institution.name}
              className="logo-img"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="logo-initials">{logoInitials}</span>
          )}
        </div>

        {/* Middle: Course Info */}
        <div className="course-info">
          <h2 className="course-title">{course.courseName}</h2>

          <div className="course-details">
            <span className="course-level">{course.courseLevel}</span>
            {course.durationWeeks && (
              <span className="course-duration">
                • {course.durationWeeks}-Week {course.durationWeeks < 26 ? 'Part-Time' : 'Full-Time'}
              </span>
            )}
            {getDeliveryMethod() && (
              <span className="delivery-method">{getDeliveryMethod()}</span>
            )}
          </div>

          <div className="institution-info">
            <p className="institution-name">{institution.name}</p>
            <div className="location-and-regional">
              {allCities.length > 0 && (
                <p className="location-info">
                  {allCities.length > 3
                    ? `${allCities.slice(0, 3).join(', ')} +${allCities.length - 3} more`
                    : allCities.join(', ')}
                </p>
              )}
              {regionalBadge && (
                <span
                  className="regional-badge"
                  data-category={regionalBadge.label.includes('Category 2') ? '2' : '3'}
                  style={{ color: regionalBadge.color }}
                >
                  {regionalBadge.icon} {regionalBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Price only */}
        <div className="price-section">
          {displayPrice ? (
            <>
              <span className="price-label">AUD</span>
              <span className="price-value">${displayPrice.toLocaleString()}</span>
              <span className="price-unit">Per Course</span>
            </>
          ) : (
            <span className="price-value">TBA</span>
          )}
        </div>
      </div>

      {/* Bottom: Porównaj/Add to Offer + Actions in one row */}
      <div className="card-footer">
        {onToggleSelect && (
          <label className="compare-checkbox-bottom" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={() => onToggleSelect(course, institution)}
            />
            <span>{isAdmin ? 'Add to Offer' : 'Compare'}</span>
          </label>
        )}
        {!onToggleSelect && (
          <div style={{ height: '40px' }}></div>
        )}
        <div className="footer-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`action-btn wishlist-btn-footer ${isInWishlist ? 'active' : ''}`}
            onClick={() => onToggleWishlist && onToggleWishlist(course, institution)}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            {isInWishlist ? '❤️' : '🤍'}
          </button>
          <button
            className="action-btn enquire-btn-footer"
            onClick={() => console.log('Enquire clicked')}
          >
            Enquire
          </button>
          <button
            className="action-btn apply-btn-footer"
            onClick={() => institution.website && openWebsite(institution.website)}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
