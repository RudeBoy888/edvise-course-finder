import { useMemo } from 'react';
import '../styles/FilterPanel.css';
import { getAllCities } from '../utils/cityMapping';
import { getRegionalCategoryBadge } from '../utils/regionalClassification';

const AUSTRALIAN_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
const AUSTRALIAN_CITIES = getAllCities();
const DURATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'under26', label: '< 26 weeks' },
  { value: '26to52', label: '26 - 52 weeks' },
  { value: '52plus', label: '52+ weeks' }
];
const FEE_PERIOD_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'tuition', label: 'Tuition' },
  { value: 'total', label: 'Total' }
];

export function FilterPanel({
  allInstitutions,
  selectedStates,
  setSelectedStates,
  selectedCities,
  setSelectedCities,
  selectedLevels,
  setSelectedLevels,
  selectedFields,
  setSelectedFields,
  durationFilter,
  setDurationFilter,
  feeMin,
  setFeeMin,
  feeMax,
  setFeeMax,
  feePeriod,
  setFeePeriod,
  includeFeeNotSpecified,
  setIncludeFeeNotSpecified,
  workComponent,
  setWorkComponent,
  foundationStudies,
  setFoundationStudies,
  selectedCategories,
  setSelectedCategories,
  activeFilterCount,
  clearAllFilters,
  isMobileModal = false
}) {

  // Extract unique course levels from data
  const courseLevels = useMemo(() => {
    const levels = new Set();
    allInstitutions.forEach((inst) => {
      inst.courses.forEach((course) => {
        if (course.courseLevel) {
          levels.add(course.courseLevel);
        }
      });
    });
    return Array.from(levels).sort();
  }, [allInstitutions]);

  // Extract unique field of education from data
  const fieldsOfEducation = useMemo(() => {
    const fields = new Set();
    allInstitutions.forEach((inst) => {
      inst.courses.forEach((course) => {
        if (course.fieldOfEducation) {
          fields.add(course.fieldOfEducation);
        }
      });
    });
    return Array.from(fields).sort();
  }, [allInstitutions]);

  const toggleState = (state) => {
    setSelectedStates(
      selectedStates.includes(state)
        ? selectedStates.filter((s) => s !== state)
        : [...selectedStates, state]
    );
  };

  const toggleCity = (city) => {
    setSelectedCities(
      selectedCities.includes(city)
        ? selectedCities.filter((c) => c !== city)
        : [...selectedCities, city]
    );
  };

  const toggleLevel = (level) => {
    setSelectedLevels(
      selectedLevels.includes(level)
        ? selectedLevels.filter((l) => l !== level)
        : [...selectedLevels, level]
    );
  };

  const toggleField = (field) => {
    setSelectedFields(
      selectedFields.includes(field)
        ? selectedFields.filter((f) => f !== field)
        : [...selectedFields, field]
    );
  };

  const toggleCategory = (category) => {
    setSelectedCategories(
      selectedCategories.includes(category)
        ? selectedCategories.filter((c) => c !== category)
        : [...selectedCategories, category]
    );
  };

  const filterContent = (
    <>
      {!isMobileModal && (
        <div className="filter-header">
          <h2>Filters</h2>
          {activeFilterCount > 0 && (
            <button className="clear-filters-btn" onClick={clearAllFilters}>
              Clear All ({activeFilterCount})
            </button>
          )}
        </div>
      )}

      {/* Location Filter */}
      <div className="filter-section">
        <h3 className="filter-title">Location</h3>
        <div className="filter-options">
          {AUSTRALIAN_STATES.map((state) => (
            <label key={state} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedStates.includes(state)}
                onChange={() => toggleState(state)}
              />
              <span>{state}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Major Cities Filter (Postcode-based) */}
      <div className="filter-section">
        <h3 className="filter-title">Major Cities</h3>
        <div className="filter-options">
          {AUSTRALIAN_CITIES.map((city) => (
            <label key={city} className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedCities.includes(city)}
                onChange={() => toggleCity(city)}
              />
              <span>{city}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Course Level Filter */}
      {courseLevels.length > 0 && (
        <div className="filter-section">
          <h3 className="filter-title">Course Level</h3>
          <div className="filter-options">
            {courseLevels.map((level) => (
              <label key={level} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={() => toggleLevel(level)}
                />
                <span>{level}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Course Area Filter */}
      {fieldsOfEducation.length > 0 && (
        <div className="filter-section">
          <h3 className="filter-title">Course Area</h3>
          <div className="filter-options">
            {fieldsOfEducation.map((field) => (
              <label key={field} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => toggleField(field)}
                />
                <span>{field}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Duration Filter */}
      <div className="filter-section">
        <h3 className="filter-title">Duration</h3>
        <select
          value={durationFilter}
          onChange={(e) => setDurationFilter(e.target.value)}
          className="filter-select"
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fee Filter */}
      <div className="filter-section">
        <h3 className="filter-title">Course Fee ($)</h3>
        <div className="fee-inputs">
          <input
            type="number"
            placeholder="Min"
            value={feeMin ?? ''}
            onChange={(e) => setFeeMin(e.target.value ? parseInt(e.target.value) : null)}
            className="fee-input"
          />
          <span className="fee-dash">—</span>
          <input
            type="number"
            placeholder="Max"
            value={feeMax ?? ''}
            onChange={(e) => setFeeMax(e.target.value ? parseInt(e.target.value) : null)}
            className="fee-input"
          />
        </div>
        <select
          value={feePeriod}
          onChange={(e) => setFeePeriod(e.target.value)}
          className="filter-select"
        >
          {FEE_PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeFeeNotSpecified}
            onChange={(e) => setIncludeFeeNotSpecified(e.target.checked)}
          />
          <span>Include fee not specified</span>
        </label>
      </div>

      {/* Work Component Filter */}
      <div className="filter-section">
        <label className="checkbox-label checkbox-large">
          <input
            type="checkbox"
            checked={workComponent}
            onChange={(e) => setWorkComponent(e.target.checked)}
          />
          <span>Work Component</span>
        </label>
      </div>

      {/* Foundation Studies Filter */}
      <div className="filter-section">
        <label className="checkbox-label checkbox-large">
          <input
            type="checkbox"
            checked={foundationStudies}
            onChange={(e) => setFoundationStudies(e.target.checked)}
          />
          <span>Foundation Studies</span>
        </label>
      </div>

      {/* Regional Category Filter */}
      <div className="filter-section">
        <h3 className="filter-title">Regional Areas</h3>
        <div className="filter-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedCategories.includes(2)}
              onChange={() => toggleCategory(2)}
            />
            <span>
              <span style={{ color: '#FFB84D', fontWeight: 'bold' }}>★</span> Cities and major regional centres
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedCategories.includes(3)}
              onChange={() => toggleCategory(3)}
            />
            <span>
              <span style={{ color: '#C7613C', fontWeight: 'bold' }}>★</span> Regional centres and other areas
            </span>
          </label>
        </div>
        <p className="filter-note">
          Australian Home Affairs designated areas for visa purposes{' '}
          <a
            href="https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list/regional-postcodes"
            target="_blank"
            rel="noopener noreferrer"
            className="filter-note-link"
          >
            (learn more)
          </a>
        </p>
      </div>
    </>
  );

  // For mobile modal, don't wrap in aside
  if (isMobileModal) {
    return filterContent;
  }

  // For desktop, wrap in aside
  return (
    <aside className="filter-sidebar">
      {filterContent}
    </aside>
  );
}
