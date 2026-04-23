const path = require('path');

// Loaded once at module level — cached across warm invocations
const RAW_DATA = require(path.join(process.cwd(), 'public', 'courses_data.json'));
const INSTITUTIONS = Object.values(RAW_DATA);

// Duplicated from src/utils/cityMapping.js — serverless functions cannot import from Vite src/
const CITY_POSTCODE_RANGES = {
  Sydney:      [[2000, 2299]],
  Newcastle:   [[2287, 2328], [2338, 2380]],
  Wollongong:  [[2500, 2530]],
  'Byron Bay': [[2480, 2495]],
  Melbourne:   [[3000, 3999]],
  'Gold Coast':[[4200, 4230]],
  Brisbane:    [[4000, 4199]],
  Cairns:      [[4800, 4899]],
  Perth:       [[6000, 6299]],
  Adelaide:    [[5000, 5199]],
  Hobart:      [[7000, 7299]],
  Canberra:    [[2600, 2618], [2900, 2920]],
  Darwin:      [[800,  900]],
};

const VOCATIONAL_LEVELS = new Set([
  'Certificate I', 'Certificate II', 'Certificate III', 'Certificate IV',
  'Diploma', 'Advanced Diploma', 'Vocational Short Course', 'Non AQF Award',
]);

const HIGHER_ED_LEVELS = new Set([
  'Bachelor Degree', 'Bachelor Honours Degree',
  'Graduate Certificate', 'Graduate Diploma',
  'Masters Degree (Coursework)', 'Masters Degree (Research)', 'Masters Degree (Extended)',
  'Doctoral Degree',
]);

function postcodeInCity(postcode, city) {
  const ranges = CITY_POSTCODE_RANGES[city];
  if (!ranges) return false;
  const num = parseInt(postcode, 10);
  if (isNaN(num)) return false;
  return ranges.some(([min, max]) => num >= min && num <= max);
}

function courseMatchesCity(course, city) {
  for (const locs of Object.values(course.locations || {})) {
    for (const loc of locs) {
      if (postcodeInCity(loc.postcode, city)) return { city: loc.city, state: loc.state };
    }
  }
  return null;
}

function courseMatchesTopic(course, words) {
  const name = (course.courseName || '').toLowerCase();
  const field = (course.fieldOfEducation || '').toLowerCase();
  return words.every(w => name.includes(w) || field.includes(w));
}

function courseMatchesLevel(course, level) {
  if (!level) return true;
  if (level === 'vocational') return VOCATIONAL_LEVELS.has(course.courseLevel);
  if (level === 'higher_education') return HIGHER_ED_LEVELS.has(course.courseLevel);
  return course.courseLevel === level;
}

function formatResult(course, institution, locationInfo) {
  return {
    courseCode: course.courseCode,
    courseName: course.courseName,
    courseLevel: course.courseLevel,
    fieldOfEducation: course.fieldOfEducation,
    durationWeeks: course.durationWeeks,
    tuitionFee: course.tuitionFee,
    totalCost: course.totalCost,
    hasWorkComponent: course.hasWorkComponent,
    description: course.description,
    providerName: institution.name,
    providerCode: institution.providerCode,
    city: locationInfo ? locationInfo.city : null,
    state: locationInfo ? locationInfo.state : null,
  };
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { topic = '', city = '', level = '', limit = '5' } = req.query;
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);
  const topicWords = topic.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const primary = [];
  const broader = []; // topic match only — used as alternatives when primary < 3

  for (const institution of INSTITUTIONS) {
    for (const course of (institution.courses || [])) {
      const topicMatch = topicWords.length === 0 || courseMatchesTopic(course, topicWords);
      const levelMatch = courseMatchesLevel(course, level);

      if (!topicMatch) continue;

      if (city) {
        const locationInfo = courseMatchesCity(course, city);
        if (locationInfo && levelMatch) {
          primary.push(formatResult(course, institution, locationInfo));
        } else if (!locationInfo && levelMatch) {
          // Matches topic+level but not city — candidate for broader/alternatives
          if (broader.length < 10) {
            const firstLoc = Object.values(course.locations || {})[0]?.[0];
            broader.push(formatResult(course, institution, firstLoc || null));
          }
        }
      } else {
        if (levelMatch) {
          primary.push(formatResult(course, institution, null));
        }
      }

      if (primary.length >= limitNum + 5) break; // Collect a bit extra for alternatives slot
    }
    if (primary.length >= limitNum + 5) break;
  }

  const courses = primary.slice(0, limitNum);
  const alternatives = primary.length < 3
    ? broader.slice(0, 5)
    : primary.slice(limitNum, limitNum + 5);

  res.status(200).json({
    courses,
    alternatives,
    total_found: courses.length,
    has_alternatives: alternatives.length > 0,
  });
};
