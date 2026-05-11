// Compares old and new courses_data.json arrays
// Returns a diff object with all changes categorized

export function compareCricosData(oldData, newData) {
  const oldMap = new Map(oldData.map(i => [i.providerCode, i]));
  const newMap = new Map(newData.map(i => [i.providerCode, i]));

  const addedInstitutions = [];
  const removedInstitutions = [];
  const addedCourses = [];
  const removedCourses = [];
  const modifiedCourses = [];

  const TRACKED_FIELDS = ['courseName', 'durationWeeks', 'tuitionFee', 'nonTuitionFee', 'totalCost', 'courseLevel', 'fieldOfEducation'];

  // Removed institutions + removed/modified courses within existing institutions
  for (const [code, oldInst] of oldMap) {
    if (!newMap.has(code)) {
      removedInstitutions.push({ providerCode: code, name: oldInst.name, courseCount: oldInst.courses.length });
      continue;
    }
    const newInst = newMap.get(code);
    const oldCourses = new Map(oldInst.courses.map(c => [c.courseCode, c]));
    const newCourses = new Map(newInst.courses.map(c => [c.courseCode, c]));

    for (const [courseCode, oldCourse] of oldCourses) {
      if (!newCourses.has(courseCode)) {
        removedCourses.push({ courseCode, courseName: oldCourse.courseName, institutionName: oldInst.name, providerCode: code });
      } else {
        const newCourse = newCourses.get(courseCode);
        const changes = [];
        for (const field of TRACKED_FIELDS) {
          if (oldCourse[field] !== newCourse[field]) {
            changes.push({ field, old: oldCourse[field], new: newCourse[field] });
          }
        }
        if (changes.length > 0) {
          modifiedCourses.push({ courseCode, courseName: newCourse.courseName, institutionName: newInst.name, providerCode: code, changes });
        }
      }
    }
    // Added courses within existing institution
    for (const [courseCode, newCourse] of newCourses) {
      if (!oldCourses.has(courseCode)) {
        addedCourses.push({ courseCode, courseName: newCourse.courseName, institutionName: newInst.name, providerCode: code });
      }
    }
  }

  // Added institutions (and their courses)
  for (const [code, newInst] of newMap) {
    if (!oldMap.has(code)) {
      addedInstitutions.push({ providerCode: code, name: newInst.name, courseCount: newInst.courses.length });
      for (const course of newInst.courses) {
        addedCourses.push({ courseCode: course.courseCode, courseName: course.courseName, institutionName: newInst.name, providerCode: code });
      }
    }
  }

  return {
    addedInstitutions,
    removedInstitutions,
    addedCourses,
    removedCourses,
    modifiedCourses,
    stats: {
      institutionsOld: oldData.length,
      institutionsNew: newData.length,
      coursesOld: oldData.reduce((s, i) => s + i.courses.length, 0),
      coursesNew: newData.reduce((s, i) => s + i.courses.length, 0),
    },
  };
}

// Compares old and new provider_levels.json or country_levels.json
export function compareLevels(oldLevels, newLevels) {
  const changes = [];
  const added = [];
  const removed = [];

  for (const [code, newEntry] of Object.entries(newLevels)) {
    if (!oldLevels[code]) {
      added.push({ code, name: newEntry.providerName || newEntry.countryName || code, level: newEntry.level });
    } else {
      const oldLevel = oldLevels[code].level;
      const newLevel = newEntry.level;
      if (oldLevel !== newLevel) {
        changes.push({
          code,
          name: newEntry.providerName || newEntry.countryName || code,
          oldLevel,
          newLevel,
        });
      }
    }
  }

  for (const [code, oldEntry] of Object.entries(oldLevels)) {
    if (!newLevels[code]) {
      removed.push({ code, name: oldEntry.providerName || oldEntry.countryName || code, level: oldEntry.level });
    }
  }

  return { changes, added, removed };
}
