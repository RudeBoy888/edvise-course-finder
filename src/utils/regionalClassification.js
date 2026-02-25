/**
 * Regional classification system based on Australian Home Affairs
 * Designated Regional Area postcodes
 *
 * Category 1: Major Cities (Sydney, Melbourne, Brisbane) — No regional benefit marker
 * Category 2: Cities and major regional centres — ⭐ badge
 * Category 3: Regional centres and other regional areas — ✦ badge
 *
 * Source: https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list/regional-postcodes
 */

const REGIONAL_CLASSIFICATION = {
  NSW: {
    category2: [
      { start: 2259, end: 2259 },
      { start: 2264, end: 2308 },
      { start: 2500, end: 2526 },
      { start: 2528, end: 2535 },
      { start: 2574, end: 2574 }
    ],
    category3: [
      { start: 2250, end: 2258 },
      { start: 2260, end: 2263 },
      { start: 2311, end: 2490 },
      { start: 2527, end: 2527 },
      { start: 2536, end: 2551 },
      { start: 2575, end: 2739 },
      { start: 2753, end: 2754 },
      { start: 2756, end: 2758 },
      { start: 2773, end: 2898 }
    ]
  },
  VIC: {
    category2: [
      { start: 3211, end: 3232 },
      { start: 3235, end: 3235 },
      { start: 3240, end: 3240 },
      { start: 3328, end: 3328 },
      { start: 3330, end: 3333 },
      { start: 3340, end: 3340 },
      { start: 3342, end: 3342 }
    ],
    category3: [
      { start: 3097, end: 3099 },
      { start: 3139, end: 3139 },
      { start: 3233, end: 3234 },
      { start: 3236, end: 3239 },
      { start: 3241, end: 3325 },
      { start: 3329, end: 3329 },
      { start: 3334, end: 3334 },
      { start: 3341, end: 3341 },
      { start: 3345, end: 3424 },
      { start: 3430, end: 3799 },
      { start: 3809, end: 3909 },
      { start: 3912, end: 3971 },
      { start: 3978, end: 3996 }
    ]
  },
  QLD: {
    category2: [
      { start: 4019, end: 4022 },
      { start: 4025, end: 4025 },
      { start: 4037, end: 4037 },
      { start: 4074, end: 4074 },
      { start: 4076, end: 4078 },
      { start: 4207, end: 4275 },
      { start: 4300, end: 4301 },
      { start: 4303, end: 4305 },
      { start: 4500, end: 4506 },
      { start: 4508, end: 4512 },
      { start: 4514, end: 4516 },
      { start: 4517, end: 4519 },
      { start: 4521, end: 4521 },
      { start: 4550, end: 4551 },
      { start: 4553, end: 4562 },
      { start: 4564, end: 4569 },
      { start: 4571, end: 4575 }
    ],
    category3: [
      { start: 4124, end: 4125 },
      { start: 4133, end: 4133 },
      { start: 4183, end: 4184 },
      { start: 4280, end: 4287 },
      { start: 4306, end: 4498 },
      { start: 4507, end: 4507 },
      { start: 4552, end: 4552 },
      { start: 4563, end: 4563 },
      { start: 4570, end: 4570 },
      { start: 4580, end: 4895 }
    ]
  },
  WA: {
    category2: [
      { start: 6000, end: 6038 },
      { start: 6050, end: 6083 },
      { start: 6090, end: 6182 },
      { start: 6208, end: 6211 },
      { start: 6214, end: 6214 },
      { start: 6556, end: 6558 }
    ],
    category3: [] // All WA postcodes not listed above are Category 3
  },
  SA: {
    category2: [
      { start: 5000, end: 5171 },
      { start: 5173, end: 5174 },
      { start: 5231, end: 5235 },
      { start: 5240, end: 5252 },
      { start: 5351, end: 5351 },
      { start: 5950, end: 5960 }
    ],
    category3: [] // All SA postcodes not listed above are Category 3
  },
  TAS: {
    category2: [
      { start: 7000, end: 7000 },
      { start: 7004, end: 7026 },
      { start: 7030, end: 7109 },
      { start: 7140, end: 7151 },
      { start: 7170, end: 7177 }
    ],
    category3: [] // All TAS postcodes not listed above are Category 3
  },
  ACT: {
    category2: [
      { start: 0, end: 9999 } // All ACT postcodes are Category 2
    ],
    category3: []
  },
  NT: {
    category2: [],
    category3: [
      { start: 0, end: 9999 } // All NT postcodes are Category 3
    ]
  }
};

/**
 * Get the regional classification category for a given postcode and state
 * @param {string|number} postcode - The postcode to check
 * @param {string} state - The state code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)
 * @returns {number} 1 (Major Cities - no marker), 2 (Cities and major regional centres - ⭐), or 3 (Regional centres - ✦)
 */
export function getRegionalCategory(postcode, state) {
  if (!postcode || !state) return 1;

  const postcodeNum = parseInt(postcode, 10);
  if (isNaN(postcodeNum)) return 1;

  const stateClassification = REGIONAL_CLASSIFICATION[state];
  if (!stateClassification) return 1;

  // Check Category 2
  for (const range of stateClassification.category2) {
    if (postcodeNum >= range.start && postcodeNum <= range.end) {
      return 2;
    }
  }

  // Check Category 3
  for (const range of stateClassification.category3) {
    if (postcodeNum >= range.start && postcodeNum <= range.end) {
      return 3;
    }
  }

  // For WA and SA, if not in Category 2, default to Category 3
  if ((state === 'WA' || state === 'SA' || state === 'TAS') && stateClassification.category3.length === 0) {
    return 3;
  }

  // Otherwise not in a designated regional area
  return 1;
}

/**
 * Get badge configuration for a regional category
 * @param {number} category - Regional category (1, 2, or 3)
 * @returns {object} Badge configuration { icon, label, color, tooltip }
 */
export function getRegionalCategoryBadge(category) {
  switch (category) {
    case 2:
      return {
        icon: '★',
        label: 'Category 2',
        color: '#FFB84D', // Gold/yellow color
        tooltip: 'Designated regional area — Cities and major regional centres'
      };
    case 3:
      return {
        icon: '★',
        label: 'Category 3',
        color: '#C7613C', // Orange color (EDVISE brand)
        tooltip: 'Designated regional area — Regional centres and other regional areas'
      };
    default:
      return null; // No badge for Category 1 (Major Cities)
  }
}
