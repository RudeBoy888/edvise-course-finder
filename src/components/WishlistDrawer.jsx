import React, { useEffect } from 'react';
import '../styles/WishlistDrawer.css';

export function WishlistDrawer({ isOpen, wishlist, onRemoveFromWishlist, onClearWishlist, onClose }) {
  // Auto-close when all courses are removed from wishlist
  useEffect(() => {
    if (isOpen && wishlist.length === 0) {
      onClose();
    }
  }, [wishlist.length, isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const totalPrice = wishlist.reduce((sum, item) => {
    const price = item.course.tuitionFee || item.course.totalCost || 0;
    return sum + (typeof price === 'number' ? price : 0);
  }, 0);

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="wishlist-drawer-overlay" onClick={onClose} />}

      {/* Drawer */}
      <div className={`wishlist-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="wishlist-drawer-header">
          <h3>❤️ Wishlist ({wishlist.length})</h3>
          <button className="wishlist-drawer-close" onClick={onClose} aria-label="Close wishlist drawer">✕</button>
        </div>

        {/* Body */}
        <div className="wishlist-drawer-body">
          {wishlist.length === 0 ? (
            <div className="wishlist-drawer-empty">
              <p>❤️ No courses in your wishlist yet</p>
              <p className="hint">Click the heart icon on courses to add them here</p>
            </div>
          ) : (
            <>
              {/* Wishlist Courses */}
              <div className="wishlist-courses-items">
                {wishlist.map((item, idx) => {
                  const price = item.course.tuitionFee || item.course.totalCost;
                  const priceStr = typeof price === 'number' ? `$${price.toLocaleString()}` : 'TBA';
                  const duration = item.course.durationWeeks ? `${item.course.durationWeeks}w` : 'N/A';

                  return (
                    <div key={idx} className="wishlist-course-row">
                      <div className="wishlist-course-details">
                        <div className="course-main">
                          <h4>{item.course.courseName}</h4>
                          <p className="institution">{item.institution.name}</p>
                        </div>
                        <div className="course-specs">
                          <span className="spec-item">{priceStr}</span>
                          <span className="spec-item">{item.course.courseLevel}</span>
                          <span className="spec-item">{duration}</span>
                        </div>
                      </div>
                      <button
                        className="remove-wishlist-btn"
                        onClick={() => onRemoveFromWishlist(item.course, item.institution)}
                        title="Remove from wishlist"
                        aria-label="Remove from wishlist"
                      >
                        ❤️
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="wishlist-drawer-total">
                <span>Total Estimated Cost:</span>
                <span className="total-amount">${totalPrice.toLocaleString()} AUD</span>
              </div>

              {/* Info */}
              <div className="wishlist-drawer-info">
                <p>
                  💡 Save your favorite courses here. Compare courses to see them side-by-side or prepare offers for clients.
                </p>
              </div>

              {/* Actions */}
              <div className="wishlist-drawer-actions">
                <button className="clear-wishlist-btn" onClick={onClearWishlist}>
                  🗑️ Clear All
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
