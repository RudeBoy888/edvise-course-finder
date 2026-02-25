import React, { useEffect, useState } from 'react';
import '../styles/CompareDrawer.css';

export function CompareDrawer({ isOpen, selectedCourses, onRemoveCourse, onClearSelection, onClose, notes, onNoteChange, onNoteClear }) {
  // Auto-close when all courses are removed
  useEffect(() => {
    if (isOpen && selectedCourses.length === 0) {
      onClose();
    }
  }, [selectedCourses.length, isOpen, onClose]);

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

  const [expandedNotes, setExpandedNotes] = useState({});

  const toggleNotes = (key) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalPrice = selectedCourses.reduce((sum, item) => {
    const price = item.course.tuitionFee || item.course.totalCost || 0;
    return sum + (typeof price === 'number' ? price : 0);
  }, 0);

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="compare-drawer-overlay" onClick={onClose} />}

      {/* Drawer */}
      <div className={`compare-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="compare-drawer-header">
          <h3>Compare Courses ({selectedCourses.length})</h3>
          <button className="compare-drawer-close" onClick={onClose} aria-label="Close comparison drawer">✕</button>
        </div>

        {/* Body */}
        <div className="compare-drawer-body">
          {selectedCourses.length === 0 ? (
            <div className="compare-drawer-empty">
              <p>No courses selected</p>
            </div>
          ) : (
            <>
              {/* Comparison List */}
              <div className="compare-courses-items">
                {selectedCourses.map((item, idx) => {
                  const price = item.course.tuitionFee || item.course.totalCost;
                  const priceStr = typeof price === 'number' ? `$${price.toLocaleString()}` : 'TBA';
                  const duration = item.course.durationWeeks ? `${item.course.durationWeeks}w` : 'N/A';

                  const courseKey = `${item.institution.providerCode}-${item.course.courseCode}`;
                  const hasNote = notes[courseKey];
                  const isExpanded = expandedNotes[courseKey];

                  return (
                    <div key={idx} className="compare-course-item">
                      {/* Main Row */}
                      <div className="compare-course-row">
                        <div className="compare-course-details">
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
                        <div className="course-actions">
                          {hasNote && (
                            <button
                              className="toggle-notes-btn"
                              onClick={() => toggleNotes(courseKey)}
                              title="Toggle notes"
                            >
                              📝
                            </button>
                          )}
                          <button
                            className="remove-course-btn"
                            onClick={() => onRemoveCourse(item.course, item.institution)}
                            title="Remove from comparison"
                            aria-label="Remove course"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Notes Section (Collapsible) */}
                      <div className={`compare-course-notes ${isExpanded ? 'expanded' : ''}`}>
                        <button
                          className="notes-toggle-header"
                          onClick={() => toggleNotes(courseKey)}
                        >
                          {isExpanded ? '▼' : '▶'} Notes
                        </button>
                        {isExpanded && (
                          <div className="notes-content">
                            <textarea
                              className="compare-notes-input"
                              placeholder="Add notes... (e.g., 'Good value', 'Check location')"
                              value={notes[courseKey] || ''}
                              onChange={(e) => onNoteChange(item.course, item.institution, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {notes[courseKey] && (
                              <button
                                className="clear-note-btn"
                                onClick={() => onNoteClear(item.course, item.institution)}
                                title="Clear note"
                              >
                                Clear note
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="compare-drawer-total">
                <span>Total Estimated Cost:</span>
                <span className="total-amount">${totalPrice.toLocaleString()} AUD</span>
              </div>

              {/* Info */}
              <div className="compare-drawer-info">
                <p>
                  💡 Compare key details side-by-side. To prepare a client offer with email templates, contact EDVISE directly.
                </p>
              </div>

              {/* Actions */}
              <div className="compare-drawer-actions">
                <button className="clear-btn" onClick={onClearSelection}>
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
