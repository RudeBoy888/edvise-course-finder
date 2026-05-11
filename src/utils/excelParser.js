import * as XLSX from 'xlsx';

// Mirrors convert_excel_to_json.py logic — runs in the browser via SheetJS
// Column indices are 0-based (Python script uses 1-based, so subtract 1)
// Data rows start at Excel row 4 → array index 3

function getRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function str(val) {
  return val != null && val !== '' ? String(val).trim() : '';
}

function parseInstitutions(sheet, existingLogoMap) {
  const rows = getRows(sheet);
  const institutions = {};
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const providerCode = str(row[0]);
    if (!providerCode) continue;
    const tradingName = str(row[1]);
    const institutionName = str(row[2]);
    const website = str(row[5]);
    const name = tradingName || institutionName;
    const registeredName = institutionName && institutionName !== name ? institutionName : null;
    const existing = existingLogoMap.get(providerCode);
    institutions[providerCode] = {
      name,
      website,
      domain: existing?.domain || '',
      logoUrl: existing?.logoUrl || '',
      ...(registeredName ? { registeredName } : {}),
    };
  }
  return institutions;
}

function parseLocations(sheet) {
  const rows = getRows(sheet);
  const locations = {};
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const providerCode = str(row[0]);
    const locationName = str(row[2]);
    if (!providerCode || !locationName) continue;
    const addr1 = str(row[4]);
    const addr2 = str(row[5]);
    const addr3 = str(row[6]);
    const address = [addr1, addr2, addr3].filter(Boolean).join(', ');
    const key = `${providerCode}__${locationName}`;
    locations[key] = {
      address,
      city: str(row[8]),
      state: str(row[9]),
      postcode: str(row[10]),
    };
  }
  return locations;
}

function parseCourses(sheet, existingDescMap) {
  const rows = getRows(sheet);
  const courses = [];
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    // Column 24 (index 23) = Expired; skip if not "no"
    const expired = str(row[23]).toLowerCase();
    if (expired !== 'no') continue;
    const providerCode = str(row[0]);
    const courseCode = str(row[2]);
    if (!providerCode || !courseCode) continue;
    // Field of education: strip "NN - " prefix
    let fieldStr = str(row[6]);
    if (fieldStr.includes(' - ')) {
      const parts = fieldStr.split(' - ');
      if (parts.length >= 2) fieldStr = parts.slice(1).join(' - ');
    }
    const boolVal = (v) => ['yes', '1', 'true'].includes(str(v).toLowerCase());
    const numVal = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : Math.round(n);
    };
    // Preserve description from existing data if new Excel doesn't have it
    const existingDesc = existingDescMap.get(`${providerCode}__${courseCode}`) || '';
    const newDesc = str(row[24]);
    courses.push({
      providerCode,
      courseCode,
      courseName: str(row[3]),
      durationWeeks: numVal(row[19]),
      tuitionFee: numVal(row[20]),
      nonTuitionFee: numVal(row[21]),
      totalCost: numVal(row[22]),
      courseLevel: str(row[12]),
      fieldOfEducation: fieldStr,
      isFoundationStudies: boolVal(row[13]),
      hasWorkComponent: boolVal(row[14]),
      description: newDesc || existingDesc,
    });
  }
  return courses;
}

function parseCourseLocations(sheet) {
  const rows = getRows(sheet);
  const map = {};
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const providerCode = str(row[0]);
    const courseCode = str(row[2]);
    const locationName = str(row[3]);
    if (!providerCode || !courseCode || !locationName) continue;
    const key = `${providerCode}__${courseCode}`;
    if (!map[key]) map[key] = [];
    const entry = { locationName, city: str(row[4]), state: str(row[5]) };
    const alreadyExists = map[key].some(
      e => e.locationName === entry.locationName && e.city === entry.city && e.state === entry.state
    );
    if (!alreadyExists) map[key].push(entry);
  }
  return map;
}

function buildOutput(institutions, locations, courses, courseLocs) {
  const coursesByProvider = {};
  for (const course of courses) {
    const { providerCode } = course;
    if (!coursesByProvider[providerCode]) coursesByProvider[providerCode] = [];
    coursesByProvider[providerCode].push(course);
  }

  const output = [];
  for (const [providerCode, instData] of Object.entries(institutions)) {
    const providerCourses = coursesByProvider[providerCode];
    if (!providerCourses) continue;

    const allStates = new Set();
    const coursesOut = providerCourses.map(course => {
      const locKey = `${providerCode}__${course.courseCode}`;
      const locList = courseLocs[locKey] || [];
      const locationsByState = {};
      for (const loc of locList) {
        const locDetailKey = `${providerCode}__${loc.locationName}`;
        const locDetail = locations[locDetailKey] || {};
        const state = loc.state || locDetail.state || '';
        if (!state) continue;
        allStates.add(state);
        if (!locationsByState[state]) locationsByState[state] = [];
        locationsByState[state].push({
          locationName: loc.locationName,
          address: locDetail.address || '',
          city: loc.city || locDetail.city || '',
          state,
          postcode: locDetail.postcode || '',
        });
      }
      const { providerCode: _pc, ...courseWithoutProvider } = course;
      return { ...courseWithoutProvider, locations: locationsByState };
    });

    output.push({
      providerCode,
      name: instData.name,
      ...(instData.registeredName ? { registeredName: instData.registeredName } : {}),
      website: instData.website,
      domain: instData.domain,
      logoUrl: instData.logoUrl,
      allStates: Array.from(allStates).sort(),
      courses: coursesOut,
    });
  }

  return output;
}

export async function parseExcelToCricosData(file, currentData = []) {
  // Build lookup maps from existing data to preserve logos and descriptions
  const existingLogoMap = new Map(
    currentData.map(inst => [inst.providerCode, { logoUrl: inst.logoUrl, domain: inst.domain }])
  );
  const existingDescMap = new Map();
  for (const inst of currentData) {
    for (const course of inst.courses) {
      if (course.description) {
        existingDescMap.set(`${inst.providerCode}__${course.courseCode}`, course.description);
      }
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });

  const requiredSheets = ['Institutions', 'Locations', 'Courses', 'Course Locations'];
  for (const name of requiredSheets) {
    if (!wb.SheetNames.includes(name)) {
      throw new Error(`Missing sheet: "${name}". Make sure you're uploading the correct CRICOS Excel file.`);
    }
  }

  const institutions = parseInstitutions(wb.Sheets['Institutions'], existingLogoMap);
  const locations = parseLocations(wb.Sheets['Locations']);
  const courses = parseCourses(wb.Sheets['Courses'], existingDescMap);
  const courseLocs = parseCourseLocations(wb.Sheets['Course Locations']);

  return buildOutput(institutions, locations, courses, courseLocs);
}
