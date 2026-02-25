/**
 * Multi-dimensional filter logic for courses
 * All conditions must pass (AND logic)
 */

import { CITY_MAPPING, isPostcodeInAnyCities } from './cityMapping';
import { getRegionalCategory } from './regionalClassification';

export function filterCourses(institutions, filters) {
  const {
    searchTerm = "",
    selectedStates = [],
    selectedCities = [],
    selectedLevels = [],
    selectedFields = [],
    durationFilter = "all",
    feeMin = null,
    feeMax = null,
    feePeriod = "all",
    includeFeeNotSpecified = true,
    workComponent = false,
    foundationStudies = false,
    selectedCategories = []
  } = filters;

  // Use selected cities directly (postcode filtering will be done later)
  const citiesToFilterBy = selectedCities;

  const term = searchTerm.toLowerCase().trim();

  return institutions
    .map((institution) => {
      let filteredCourses = institution.courses;

      // 1. Search term filter - search by course name only
      if (term) {
        const searchWords = term.split(/\s+/).filter(word => word.length > 0);

        filteredCourses = filteredCourses.filter((course) => {
          // Show course if ANY search word matches course name
          return searchWords.some(word => {
            return course.courseName.toLowerCase().includes(word);
          });
        });
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 2. Course Level filter
      if (selectedLevels.length > 0) {
        filteredCourses = filteredCourses.filter((course) =>
          selectedLevels.includes(course.courseLevel)
        );
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 3. Field of Education filter
      if (selectedFields.length > 0) {
        filteredCourses = filteredCourses.filter((course) =>
          selectedFields.includes(course.fieldOfEducation)
        );
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 4. Duration filter
      if (durationFilter !== "all") {
        filteredCourses = filteredCourses.filter((course) => {
          const weeks = course.durationWeeks;
          if (weeks === null) return false;

          switch (durationFilter) {
            case "under26":
              return weeks < 26;
            case "26to52":
              return weeks >= 26 && weeks < 52;
            case "52plus":
              return weeks >= 52;
            default:
              return true;
          }
        });
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 5. Fee filter
      if (feeMin !== null || feeMax !== null) {
        filteredCourses = filteredCourses.filter((course) => {
          // Get the relevant fee for comparison
          let feeToCheck = null;
          if (feePeriod === "tuition") {
            feeToCheck = course.tuitionFee;
          } else if (feePeriod === "total") {
            feeToCheck = course.totalCost;
          } else {
            // "all" - use total cost if available, otherwise tuition fee
            feeToCheck = course.totalCost || course.tuitionFee;
          }

          // If no fee available
          if (feeToCheck === null) {
            return includeFeeNotSpecified;
          }

          // Check min/max bounds
          if (feeMin !== null && feeToCheck < feeMin) return false;
          if (feeMax !== null && feeToCheck > feeMax) return false;

          return true;
        });
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 6. Work Component filter
      if (workComponent) {
        filteredCourses = filteredCourses.filter(
          (course) => course.hasWorkComponent === true
        );
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 7. Foundation Studies filter
      if (foundationStudies) {
        filteredCourses = filteredCourses.filter(
          (course) => course.isFoundationStudies === true
        );
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 8. Location filter - filter locations to selected states or cities
      if (selectedStates.length > 0 || citiesToFilterBy.length > 0) {
        filteredCourses = filteredCourses.map((course) => {
          const filteredLocations = {};

          // Iterate over all states in the course locations
          Object.entries(course.locations).forEach(([state, locations]) => {
            // Check if state matches selectedStates (if any)
            const stateMatches = selectedStates.length === 0 || selectedStates.includes(state);

            // Filter locations in this state by city (via postcode)
            if (stateMatches) {
              const filteredStateLocations = locations.filter(loc => {
                // If no city filter, include all locations in this state
                if (citiesToFilterBy.length === 0) {
                  return true;
                }
                // Check if location postcode falls within any selected city's postcode ranges
                return isPostcodeInAnyCities(loc.postcode, citiesToFilterBy);
              });

              if (filteredStateLocations.length > 0) {
                filteredLocations[state] = filteredStateLocations;
              }
            } else if (citiesToFilterBy.length > 0) {
              // If state doesn't match but cities are selected, still check if location postcode matches
              const filteredStateLocations = locations.filter(loc => {
                return isPostcodeInAnyCities(loc.postcode, citiesToFilterBy);
              });

              if (filteredStateLocations.length > 0) {
                filteredLocations[state] = filteredStateLocations;
              }
            }
          });

          return {
            ...course,
            locations: filteredLocations
          };
        });

        // Remove courses with no locations in selected states/cities
        filteredCourses = filteredCourses.filter(
          (course) => Object.keys(course.locations).length > 0
        );
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      // 9. Regional Category filter (based on Home Affairs designated areas)
      if (selectedCategories.length > 0) {
        filteredCourses = filteredCourses.map((course) => {
          const filteredLocations = {};

          // Iterate over all locations and check their regional category
          Object.entries(course.locations).forEach(([state, locations]) => {
            const filteredStateLocations = locations.filter(loc => {
              // Get the regional category for this location's postcode
              const category = getRegionalCategory(loc.postcode, state);
              // Location passes if its category is in selectedCategories
              return selectedCategories.includes(category);
            });

            if (filteredStateLocations.length > 0) {
              filteredLocations[state] = filteredStateLocations;
            }
          });

          return {
            ...course,
            locations: filteredLocations
          };
        });

        // Remove courses with no locations in selected regional categories
        filteredCourses = filteredCourses.filter(
          (course) => Object.keys(course.locations).length > 0
        );
      }

      if (filteredCourses.length === 0) {
        return null;
      }

      return {
        ...institution,
        courses: filteredCourses
      };
    })
    .filter((inst) => inst !== null);
}
