import React, { useState, useCallback, useEffect } from 'react';
import '../styles/OfferModal.css';

const STORAGE_KEY = 'edvise_offers';

// Generate email template
function generateEmailTemplate(clientName, courses) {
  const coursesList = courses
    .map((item) => {
      const { course, institution } = item;

      // Get first city from locations
      const firstState = Object.values(course.locations || {})[0] || [];
      const city = firstState[0]?.city || '';

      // Duration
      const duration = course.durationWeeks ? `${course.durationWeeks} weeks` : '—';

      // Tuition fee
      const tuition = typeof course.tuitionFee === 'number'
        ? `AUD $${course.tuitionFee.toLocaleString()}`
        : '—';

      // Fee per term (13 weeks ≈ 3 months)
      let feePerTerm = '—';
      if (typeof course.tuitionFee === 'number' && course.durationWeeks) {
        const terms = course.durationWeeks / 13;
        const perTerm = Math.round(course.tuitionFee / terms);
        feePerTerm = `AUD $${perTerm.toLocaleString()}`;
      }

      // Non-tuition fee (enrolment + material bundled in source data)
      const nonTuition = typeof course.nonTuitionFee === 'number' && course.nonTuitionFee > 0
        ? `AUD $${course.nonTuitionFee.toLocaleString()}`
        : '—';

      return `${course.courseName}
${institution.name}${city ? ` | ${city}` : ''}
Duration: ${duration} | Tuition Fee: ${tuition} | Fee per term: ${feePerTerm}
Enrolment Fee: — | Material Fee: ${nonTuition}`;
    })
    .join('\n\n');

  return `Hi${clientName ? ` ${clientName}` : ''},

Thank you for sharing your interests and letting us know what kind of programs you're looking to enrol in. Based on your preferences and preferred location, we have prepared a selection of suitable study options for you.

Below are some example programs that align with your profile:

${coursesList}

The tuition fees are structured per term (approximately every 3 months). To obtain the CoE (Confirmation of Enrolment), which is required for your student visa application, you only need to pay the first term (3 months) along with the enrolment and material fees. The remaining tuition can be paid progressively before each new term begins.

Please also keep in mind the additional costs related to your visa application:

Visa Application Fee: approx. AUD $2,000
OSHC (health insurance): approx. AUD $700 per year
(This must be paid upfront for the full duration of your visa. The exact amount will be calculated once the offer letter is issued.)

Please let us know if any of these options match your expectations, or if you would like us to explore other programs for you. We are here to help you find the best possible pathway for your studies in Australia.

We look forward to your feedback.

Best regards,
`;
}

export function OfferModal({ isOpen, onClose, selectedCourses, onClearSelection }) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [offers, setOffers] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  // Initialize email template when modal opens
  useEffect(() => {
    if (isOpen && selectedCourses.length > 0) {
      const template = generateEmailTemplate(clientName, selectedCourses);
      setEmailTemplate(template);
    }
  }, [isOpen, selectedCourses, clientName]);

  // Load offers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOffers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load offers:', e);
      }
    }
  }, []);

  const handleSaveOffer = useCallback(() => {
    if (!clientName || !clientEmail) {
      alert('Please enter client name and email');
      return;
    }

    const newOffer = {
      id: Date.now(),
      clientName,
      clientEmail,
      clientPhone,
      courses: selectedCourses,
      emailTemplate,
      createdAt: new Date().toISOString(),
    };

    const updatedOffers = [newOffer, ...offers];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
    setOffers(updatedOffers);

    // Show confirmation
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);

    // Clear form
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setEmailTemplate('');
    onClearSelection();
  }, [clientName, clientEmail, clientPhone, selectedCourses, emailTemplate, offers, onClearSelection]);

  const handleCopyEmail = useCallback(() => {
    navigator.clipboard.writeText(emailTemplate);
    alert('Email copied to clipboard!');
  }, [emailTemplate]);

  const handleDeleteOffer = useCallback((id) => {
    const updatedOffers = offers.filter(offer => offer.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
    setOffers(updatedOffers);
  }, [offers]);

  if (!isOpen) return null;

  return (
    <div className="offer-modal-overlay" onClick={onClose}>
      <div className="offer-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="offer-modal-header">
          <h2>Prepare Client Offer</h2>
          <button className="offer-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="offer-tabs">
          <button className="offer-tab active">New Offer</button>
          <button className="offer-tab" disabled={offers.length === 0}>
            Saved Offers ({offers.length})
          </button>
        </div>

        {/* New Offer Form */}
        <div className="offer-modal-body">
          {/* Client Information Section */}
          <div className="offer-section">
            <h3>Client Information</h3>
            <div className="offer-form-group">
              <label>Client Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="offer-form-row">
              <div className="offer-form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="offer-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+61 2 XXXX XXXX"
                />
              </div>
            </div>
          </div>

          {/* Selected Courses Section */}
          {selectedCourses.length > 0 && (
            <div className="offer-section">
              <h3>Selected Courses ({selectedCourses.length})</h3>
              <div className="offer-courses-list">
                {selectedCourses.map((item, idx) => {
                  const price = item.course.tuitionFee || item.course.totalCost;
                  const priceStr = typeof price === 'number' ? `$${price.toLocaleString()}` : 'TBA';
                  return (
                    <div key={idx} className="offer-course-item">
                      <div className="course-info">
                        <h4>{item.course.courseName}</h4>
                        <p className="institution-name">{item.institution.name}</p>
                        <p className="course-level">{item.course.courseLevel} • {item.course.durationWeeks ? `${item.course.durationWeeks} weeks` : 'N/A'}</p>
                      </div>
                      <div className="course-price">{priceStr}</div>
                    </div>
                  );
                })}
              </div>
              <div className="offer-total">
                Total: ${selectedCourses.reduce((sum, item) => {
                  const price = item.course.tuitionFee || item.course.totalCost || 0;
                  return sum + (typeof price === 'number' ? price : 0);
                }, 0).toLocaleString()} AUD
              </div>
            </div>
          )}

          {/* Email Template Section */}
          <div className="offer-section">
            <h3>Email Template</h3>
            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="offer-email-textarea"
              rows={12}
            />
            <p className="offer-hint">Edit the email template as needed. The client's name will be personalized.</p>
          </div>

          {/* Action Buttons */}
          <div className="offer-actions">
            <button className="offer-btn offer-btn-copy" onClick={handleCopyEmail}>
              📋 Copy Email
            </button>
            <button
              className="offer-btn offer-btn-save"
              onClick={handleSaveOffer}
              disabled={selectedCourses.length === 0}
            >
              💾 Save Offer
            </button>
          </div>

          {showSaved && (
            <div className="offer-success-message">
              ✓ Offer saved successfully!
            </div>
          )}
        </div>

        {/* Saved Offers Section (hidden initially) */}
        {offers.length > 0 && (
          <div className="offer-saved-section" style={{ display: 'none' }}>
            <div className="offer-saved-list">
              {offers.map((offer) => (
                <div key={offer.id} className="offer-saved-item">
                  <div className="saved-offer-header">
                    <h4>{offer.clientName}</h4>
                    <span className="saved-offer-date">
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="saved-offer-email">{offer.clientEmail}</p>
                  <p className="saved-offer-courses">
                    {offer.courses.length} course{offer.courses.length !== 1 ? 's' : ''}
                  </p>
                  <div className="saved-offer-actions">
                    <button className="saved-offer-btn" onClick={() => navigator.clipboard.writeText(offer.emailTemplate)}>
                      📋 Copy
                    </button>
                    <button className="saved-offer-btn delete" onClick={() => handleDeleteOffer(offer.id)}>
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
