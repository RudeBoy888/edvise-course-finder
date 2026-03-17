import '../styles/LocationSearch.css';

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
        <select
          value={locationRadius}
          onChange={e => onRadiusChange(Number(e.target.value))}
          className="radius-select"
          aria-label="Search radius"
        >
          <option value={0}>Any distance</option>
          <option value={5}>Within 5 km</option>
          <option value={10}>Within 10 km</option>
          <option value={15}>Within 15 km</option>
          <option value={25}>Within 25 km</option>
        </select>
      )}
    </div>
  );
}
