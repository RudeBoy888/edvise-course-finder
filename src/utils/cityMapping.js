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
      [2000, 2299]   // Greater Sydney metropolitan area
    ]
  },
  Newcastle: {
    state: 'NSW',
    name: 'Newcastle',
    postcodeRanges: [
      [2287, 2328],  // Newcastle, Lake Macquarie, Hunter
      [2338, 2380]   // Maitland, Singleton, Raymond Terrace
    ]
  },
  Wollongong: {
    state: 'NSW',
    name: 'Wollongong',
    postcodeRanges: [
      [2500, 2530]   // Wollongong, Illawarra, Shellharbour
    ]
  },
  'Byron Bay': {
    state: 'NSW',
    name: 'Byron Bay',
    postcodeRanges: [
      [2480, 2495]   // Byron Bay, Tweed Heads, Northern Rivers
    ]
  },
  Melbourne: {
    state: 'VIC',
    name: 'Melbourne',
    postcodeRanges: [
      [3000, 3999]   // Greater Melbourne metropolitan area (all VIC suburbs)
    ]
  },
  'Gold Coast': {
    state: 'QLD',
    name: 'Gold Coast',
    postcodeRanges: [
      [4200, 4230]   // Gold Coast, Surfers Paradise region
    ]
  },
  Brisbane: {
    state: 'QLD',
    name: 'Brisbane',
    postcodeRanges: [
      [4000, 4199]   // Brisbane metropolitan area (excludes Gold Coast)
    ]
  },
  Cairns: {
    state: 'QLD',
    name: 'Cairns',
    postcodeRanges: [
      [4800, 4899]   // Cairns and tropical north Queensland
    ]
  },
  Perth: {
    state: 'WA',
    name: 'Perth',
    postcodeRanges: [
      [6000, 6299]   // Perth metropolitan area and surrounding suburbs
    ]
  },
  Adelaide: {
    state: 'SA',
    name: 'Adelaide',
    postcodeRanges: [
      [5000, 5199]   // Adelaide metropolitan area
    ]
  },
  Hobart: {
    state: 'TAS',
    name: 'Hobart',
    postcodeRanges: [
      [7000, 7299]   // Hobart and Tasmania region
    ]
  },
  Canberra: {
    state: 'ACT',
    name: 'Canberra',
    postcodeRanges: [
      [2600, 2618],  // Canberra ACT region
      [2900, 2920]   // Extended ACT postcodes if needed
    ]
  },
  Darwin: {
    state: 'NT',
    name: 'Darwin',
    postcodeRanges: [
      [800, 900]     // Darwin and greater Darwin area (NT postcodes 0800-0899)
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
