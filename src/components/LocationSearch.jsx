import '../styles/LocationSearch.css';

const RADIUS_OPTIONS = [5, 10, 15, 25];

export function LocationSearch({ locationQuery, onLocationChange, locationRadius, onRadiusChange }) {
  return (
    <div className="location-search">
      <div className="location-input-wrapper">
        <input
          type="text"
          placeholder="Location (e.g. North Sydney)"
          value={locationQuery}
          onChange={e => onLocationChange(e.target.value)}
          className="search-input location-input"
          aria-label="Search by location"
        />
        {locationQuery && (
          <button
            className="location-clear-btn"
            onClick={() => onLocationChange('')}
            aria-label="Clear location"
          >
            ✕
          </button>
        )}
      </div>

      {locationQuery && (
        <div className="radius-pills">
          {RADIUS_OPTIONS.map(km => (
            <button
              key={km}
              className={`radius-pill${locationRadius === km ? ' radius-pill--active' : ''}`}
              onClick={() => onRadiusChange(locationRadius === km ? 0 : km)}
              aria-pressed={locationRadius === km}
            >
              {km} km
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
