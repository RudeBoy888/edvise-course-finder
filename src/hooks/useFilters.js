import { useState, useEffect, useCallback, useMemo } from 'react';
import { filterCourses } from '../utils/search';

const DEBOUNCE_DELAY = 300;

export function useFilters(allInstitutions) {
  // Search and filter state
  const [searchTerm, setSearchTermState] = useState('');
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [durationFilter, setDurationFilter] = useState('all');
  const [feeMin, setFeeMin] = useState(null);
  const [feeMax, setFeeMax] = useState(null);
  const [feePeriod, setFeePeriod] = useState('all');
  const [includeFeeNotSpecified, setIncludeFeeNotSpecified] = useState(true);
  const [workComponent, setWorkComponent] = useState(false);
  const [foundationStudies, setFoundationStudies] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Pagination and sorting state
  const [sortBy, setSortBy] = useState('name'); // 'name', 'courseCount'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Offer/selection state
  const [selectedCourses, setSelectedCourses] = useState([]); // Array of {course, institution}

  // Debounced search term for actual filtering
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 on search change
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Apply filters (debounced search, not debounced other filters)
  const filteredInstitutions = useMemo(() => {
    if (!allInstitutions || allInstitutions.length === 0) {
      return [];
    }

    const results = filterCourses(allInstitutions, {
      searchTerm: debouncedSearchTerm,
      selectedStates,
      selectedCities,
      selectedLevels,
      selectedFields,
      durationFilter,
      feeMin,
      feeMax,
      feePeriod,
      includeFeeNotSpecified,
      workComponent,
      foundationStudies,
      selectedCategories
    });

    return results;
  }, [
    allInstitutions,
    debouncedSearchTerm,
    selectedStates,
    selectedCities,
    selectedLevels,
    selectedFields,
    durationFilter,
    feeMin,
    feeMax,
    feePeriod,
    includeFeeNotSpecified,
    workComponent,
    foundationStudies,
    selectedCategories
  ]);

  // Reset to page 1 when filters change (but not pagination/sort changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedStates,
    selectedCities,
    selectedLevels,
    selectedFields,
    durationFilter,
    feeMin,
    feeMax,
    feePeriod,
    includeFeeNotSpecified,
    workComponent,
    foundationStudies,
    selectedCategories
  ]);

  // Flatten courses from filtered institutions (each course with institution context)
  const flattenedCourses = useMemo(() => {
    const flattened = [];
    filteredInstitutions.forEach((institution) => {
      institution.courses.forEach((course) => {
        flattened.push({
          ...course,
          institution // Include institution data for context
        });
      });
    });
    return flattened;
  }, [filteredInstitutions]);

  // Sort flattened courses
  const sortedCourses = useMemo(() => {
    const sorted = [...flattenedCourses];

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.courseName.localeCompare(b.courseName));
    } else if (sortBy === 'price') {
      sorted.sort((a, b) => {
        const priceA = a.tuitionFee || a.totalCost || 0;
        const priceB = b.tuitionFee || b.totalCost || 0;
        return priceA - priceB;
      });
    }

    return sorted;
  }, [flattenedCourses, sortBy]);

  // Pagination by courses
  const totalCourses = flattenedCourses.length;
  const totalInstitutions = filteredInstitutions.length;
  const totalPages = Math.ceil(totalCourses / itemsPerPage);

  const paginatedCourses = useMemo(() => {
    if (totalCourses === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedCourses.slice(startIndex, endIndex);
  }, [sortedCourses, currentPage, itemsPerPage, totalCourses]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearchTerm.trim()) count++;
    if (selectedStates.length > 0) count++;
    if (selectedCities.length > 0) count++;
    if (selectedLevels.length > 0) count++;
    if (selectedFields.length > 0) count++;
    if (durationFilter !== 'all') count++;
    if (feeMin !== null || feeMax !== null) count++;
    if (!includeFeeNotSpecified) count++;
    if (workComponent) count++;
    if (foundationStudies) count++;
    if (selectedCategories.length > 0) count++;
    return count;
  }, [
    debouncedSearchTerm,
    selectedStates,
    selectedCities,
    selectedLevels,
    selectedFields,
    durationFilter,
    feeMin,
    feeMax,
    includeFeeNotSpecified,
    workComponent,
    foundationStudies,
    selectedCategories
  ]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTermState('');
    setSelectedStates([]);
    setSelectedCities([]);
    setSelectedLevels([]);
    setSelectedFields([]);
    setDurationFilter('all');
    setFeeMin(null);
    setFeeMax(null);
    setFeePeriod('all');
    setIncludeFeeNotSpecified(true);
    setWorkComponent(false);
    setFoundationStudies(false);
    setSelectedCategories([]);
    setSortBy('name');
    setCurrentPage(1);
  }, []);

  // Handlers for state setters that reset pagination
  const handleSelectedStatesChange = useCallback((states) => {
    setSelectedStates(states);
    setCurrentPage(1);
  }, []);

  const handleSelectedCitiesChange = useCallback((cities) => {
    setSelectedCities(cities);
    setCurrentPage(1);
  }, []);

  const handleSelectedLevelsChange = useCallback((levels) => {
    setSelectedLevels(levels);
    setCurrentPage(1);
  }, []);

  const handleSelectedFieldsChange = useCallback((fields) => {
    setSelectedFields(fields);
    setCurrentPage(1);
  }, []);

  const handleDurationFilterChange = useCallback((duration) => {
    setDurationFilter(duration);
    setCurrentPage(1);
  }, []);

  const handleFeeMinChange = useCallback((min) => {
    setFeeMin(min);
    setCurrentPage(1);
  }, []);

  const handleFeeMaxChange = useCallback((max) => {
    setFeeMax(max);
    setCurrentPage(1);
  }, []);

  const handleFeePeriodChange = useCallback((period) => {
    setFeePeriod(period);
    setCurrentPage(1);
  }, []);

  const handleIncludeFeeNotSpecifiedChange = useCallback((include) => {
    setIncludeFeeNotSpecified(include);
    setCurrentPage(1);
  }, []);

  const handleWorkComponentChange = useCallback((checked) => {
    setWorkComponent(checked);
    setCurrentPage(1);
  }, []);

  const handleFoundationStudiesChange = useCallback((checked) => {
    setFoundationStudies(checked);
    setCurrentPage(1);
  }, []);

  const handleSelectedCategoriesChange = useCallback((categories) => {
    setSelectedCategories(categories);
    setCurrentPage(1);
  }, []);

  // Offer/selection handlers
  const toggleCourseSelection = useCallback((course, institution) => {
    const courseId = `${institution.providerCode}-${course.courseCode}`;
    setSelectedCourses(prev => {
      const exists = prev.some(item =>
        item.course.courseCode === course.courseCode &&
        item.institution.providerCode === institution.providerCode
      );

      if (exists) {
        return prev.filter(item =>
          !(item.course.courseCode === course.courseCode &&
            item.institution.providerCode === institution.providerCode)
        );
      } else {
        return [...prev, { course, institution }];
      }
    });
  }, []);

  const isCourseSelected = useCallback((course, institution) => {
    return selectedCourses.some(item =>
      item.course.courseCode === course.courseCode &&
      item.institution.providerCode === institution.providerCode
    );
  }, [selectedCourses]);

  const clearSelectedCourses = useCallback(() => {
    setSelectedCourses([]);
  }, []);

  return {
    // Search term
    searchTerm,
    setSearchTerm: setSearchTermState,

    // Filter state and setters
    selectedStates,
    setSelectedStates: handleSelectedStatesChange,
    selectedCities,
    setSelectedCities: handleSelectedCitiesChange,
    selectedLevels,
    setSelectedLevels: handleSelectedLevelsChange,
    selectedFields,
    setSelectedFields: handleSelectedFieldsChange,
    durationFilter,
    setDurationFilter: handleDurationFilterChange,
    feeMin,
    setFeeMin: handleFeeMinChange,
    feeMax,
    setFeeMax: handleFeeMaxChange,
    feePeriod,
    setFeePeriod: handleFeePeriodChange,
    includeFeeNotSpecified,
    setIncludeFeeNotSpecified: handleIncludeFeeNotSpecifiedChange,
    workComponent,
    setWorkComponent: handleWorkComponentChange,
    foundationStudies,
    setFoundationStudies: handleFoundationStudiesChange,
    selectedCategories,
    setSelectedCategories: handleSelectedCategoriesChange,

    // Pagination and sorting state
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // Derived data
    paginatedCourses,
    totalInstitutions,
    totalCourses,
    totalPages,
    activeFilterCount,

    // Offer/selection state
    selectedCourses,
    toggleCourseSelection,
    isCourseSelected,
    clearSelectedCourses,

    // Utilities
    clearAllFilters
  };
}
