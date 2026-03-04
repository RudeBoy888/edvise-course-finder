/**
 * Australian Cities to Postcode Ranges Mapping
 * Used for accurate city-based searching
 * Each city maps to ALL postcode ranges it covers
 *
 * Postcode ranges format: [min, max] (inclusive)
 * Example: [2000, 2099] covers 2000, 2001, ..., 2099
 */

export const CITY_MAPPING = {
  Sydney: {
    state: 'NSW',
    name: 'Sydney',
    postcodeRanges: [
      [2000, 2799],  // Entire NSW postcode range
      [2800, 2999]   // ACT region (Canberra area)
    ]
  },
  Newcastle: {
    state: 'NSW',
    name: 'Newcastle',
    postcodeRanges: [
      [2000, 2799],  // NSW coverage (Newcastle is part of NSW postal system)
      [2800, 2999]   // ACT region (Canberra area)
    ]
  },
  Wollongong: {
    state: 'NSW',
    name: 'Wollongong',
    postcodeRanges: [
      [2000, 2799],  // NSW coverage (Wollongong is part of NSW postal system)
      [2800, 2999]   // ACT region (Canberra area)
    ]
  },
  'Byron Bay': {
    state: 'NSW',
    name: 'Byron Bay',
    postcodeRanges: [
      [2000, 2799],  // NSW coverage (Byron Bay is part of NSW postal system)
      [2800, 2999]   // ACT region (Canberra area)
    ]
  },
  Melbourne: {
    state: 'VIC',
    name: 'Melbourne',
    postcodeRanges: [
      [3000, 3999]   // Entire VIC postcode range (covers all major cities in Victoria)
    ]
  },
  'Gold Coast': {
    state: 'QLD',
    name: 'Gold Coast',
    postcodeRanges: [
      [4000, 4999]   // Entire QLD postcode range (covers all major cities in Queensland)
    ]
  },
  Brisbane: {
    state: 'QLD',
    name: 'Brisbane',
    postcodeRanges: [
      [4000, 4999]   // QLD coverage (Brisbane is part of QLD postal system)
    ]
  },
  Cairns: {
    state: 'QLD',
    name: 'Cairns',
    postcodeRanges: [
      [4000, 4999]   // QLD coverage (Cairns is part of QLD postal system)
    ]
  },
  Perth: {
    state: 'WA',
    name: 'Perth',
    postcodeRanges: [
      [6000, 6999]   // Entire WA postcode range (covers all major cities in Western Australia)
    ]
  },
  Adelaide: {
    state: 'SA',
    name: 'Adelaide',
    postcodeRanges: [
      [5000, 5999]   // Entire SA postcode range (covers all major cities in South Australia)
    ]
  },
  Hobart: {
    state: 'TAS',
    name: 'Hobart',
    postcodeRanges: [
      [7000, 7999]   // Entire TAS postcode range (covers all major cities in Tasmania)
    ]
  },
  Canberra: {
    state: 'ACT',
    name: 'Canberra',
    postcodeRanges: [
      [2600, 2699]   // Entire ACT postcode range (Canberra and surrounding ACT region)
    ]
  },
  Darwin: {
    state: 'NT',
    name: 'Darwin',
    postcodeRanges: [
      [800, 899]     // Entire NT postcode range (Darwin and greater Darwin area, NT postcodes 0800-0899)
    ]
  }
};

/**
 * Get all cities in the mapping (sorted alphabetically)
 */
export function getAllCities() {
  return Object.keys(CITY_MAPPING).sort();
}

/**
 * Get postcode ranges for a specific city
 */
export function getPostcodeRangesForCity(city) {
  return CITY_MAPPING[city]?.postcodeRanges || [];
}

/**
 * Check if a postcode falls within a city's postcode ranges
 */
export function isPostcodeInCity(postcode, city) {
  if (!postcode || typeof postcode !== 'string') return false;

  const postcodeNum = parseInt(postcode, 10);
  if (isNaN(postcodeNum)) return false;

  const ranges = getPostcodeRangesForCity(city);
  return ranges.some(([min, max]) => postcodeNum >= min && postcodeNum <= max);
}

/**
 * Check if a postcode falls within ANY of the selected cities
 */
export function isPostcodeInAnyCities(postcode, cities) {
  if (!postcode || !cities || cities.length === 0) return true; // No filter = all postcodes
  return cities.some(city => isPostcodeInCity(postcode, city));
}

/**
 * Get state for a specific city
 */
export function getStateForCity(city) {
  return CITY_MAPPING[city]?.state || null;
}

/**
 * Get display name for a specific city
 */
export function getCityDisplayName(city) {
  return CITY_MAPPING[city]?.name || city;
}

/**
 * Get all states that have cities in the mapping
 */
export function getStatesFromCities(cities) {
  const states = new Set();
  cities.forEach(city => {
    const state = getStateForCity(city);
    if (state) states.add(state);
  });
  return Array.from(states);
}
