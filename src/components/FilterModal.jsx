import React from 'react';
import '../styles/FilterModal.css';

export function FilterModal({
  isOpen,
  onClose,
  children
}) {
  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="filter-modal-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Bottom sheet modal */}
      <div className={`filter-modal ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="filter-modal-header">
          <div className="filter-modal-handle" />
          <h2 className="filter-modal-title">Filters</h2>
          <button
            className="filter-modal-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="filter-modal-content">
          {children}
        </div>
      </div>
    </>
  );
}
