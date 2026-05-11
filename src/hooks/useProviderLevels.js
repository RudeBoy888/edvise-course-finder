import { useState, useEffect, useCallback } from 'react';

export function useProviderLevels() {
  const [providerLevels, setProviderLevels] = useState({});
  const [countryLevels, setCountryLevels] = useState({});

  useEffect(() => {
    Promise.all([
      fetch('/provider_levels.json').then(r => r.json()).catch(() => ({})),
      fetch('/country_levels.json').then(r => r.json()).catch(() => ({})),
    ]).then(([providers, countries]) => {
      setProviderLevels(providers);
      setCountryLevels(countries);
    });
  }, []);

  // Returns 'streamlined' | 'regular' | 'unknown' for a country + provider combination
  const checkCompatibility = useCallback((countryCode, providerCode) => {
    if (!countryCode) return 'unknown';

    const countryInfo = countryLevels[countryCode];
    const providerInfo = providerLevels[providerCode];

    if (!countryInfo?.level || !providerInfo?.level) return 'unknown';

    const cL = countryInfo.level;
    const pL = providerInfo.level;

    // Matrix:
    // Country L1 → all schools Streamlined
    // Country L2 → L1+L2 Streamlined, L3 Regular
    // Country L3 → L1 Streamlined, L2+L3 Regular
    if (cL === 1) return 'streamlined';
    if (cL === 2) return pL <= 2 ? 'streamlined' : 'regular';
    if (cL === 3) return pL === 1 ? 'streamlined' : 'regular';
    return 'unknown';
  }, [countryLevels, providerLevels]);

  return { providerLevels, countryLevels, checkCompatibility };
}
