import React from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { FilterModal } from './components/FilterModal';
import { ResultBar } from './components/ResultBar';
import { Pagination } from './components/Pagination';
import { CourseCard } from './components/CourseCard';
import { CourseModal } from './components/CourseModal';
import { OfferModal } from './components/OfferModal';
import { CompareDrawer } from './components/CompareDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { AdminPanel } from './components/AdminPanel';
import { useCourseData } from './hooks/useCourseData';
import { useFilters } from './hooks/useFilters';
import { useWishlist } from './hooks/useWishlist';
import { useCompareNotes } from './hooks/useCompareNotes';
import edviseLogo from './assets/edvise-logo.png';
import './App.css';

function App() {
  const { data, loading, error } = useCourseData();
  const filters = useFilters(data);
  const { wishlist, toggleWishlist, isInWishlist, clearWishlist } = useWishlist();
  const { notes, getNote, setNote, clearNote } = useCompareNotes();
  const [selectedCourse, setSelectedCourse] = React.useState(null);
  const [selectedInstitution, setSelectedInstitution] = React.useState(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = React.useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = React.useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = React.useState(false);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = React.useState(false);
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = React.useState(false);

  // Persist admin authentication to localStorage
  React.useEffect(() => {
    const savedAuthState = localStorage.getItem('edvise_admin_authenticated');
    if (savedAuthState === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  // Save admin authentication state when it changes
  React.useEffect(() => {
    localStorage.setItem('edvise_admin_authenticated', isAdminAuthenticated.toString());
  }, [isAdminAuthenticated]);

  // Debug: Log data to console
  React.useEffect(() => {
    if (data && data.length > 0) {
      const anu = data.find(i => i.domain === 'anu.edu.au');
      const griffith = data.find(i => i.domain === 'griffith.edu.au');
      console.log('✓ Data loaded:', data.length, 'institutions');
      console.log('ANU:', anu?.name, '- logoUrl:', anu?.logoUrl);
      console.log('Griffith:', griffith?.name, '- logoUrl:', griffith?.logoUrl);
    }
  }, [data]);

  const handleCardClick = (course, institution) => {
    setSelectedCourse(course);
    setSelectedInstitution(institution);
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
    setSelectedInstitution(null);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <img src={edviseLogo} alt="EDVISE Education Agency" className="logo" />
          <div className="header-text-box">
            <h1>EDVISE Course Finder</h1>
          </div>
          {isAdminAuthenticated && (
            <div className="header-admin-info">
              <div className="admin-menu-container">
                <button
                  className="admin-menu-trigger"
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  title="Admin Menu"
                >
                  👨‍💼 Admin
                </button>
                {isAdminMenuOpen && (
                  <div className="admin-menu-dropdown">
                    <button
                      className="admin-menu-item"
                      onClick={() => {
                        setIsAdminPanelOpen(true);
                        setIsAdminMenuOpen(false);
                      }}
                    >
                      📊 Dashboard
                    </button>
                    <div className="admin-menu-divider"></div>
                    <button
                      className="admin-menu-item logout"
                      onClick={() => {
                        setIsAdminAuthenticated(false);
                        setIsAdminPanelOpen(false);
                        setIsAdminMenuOpen(false);
                      }}
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="subtitle">Find Australian courses by CRICOS institutions</p>
      </header>

      <main className="app-main">
        <SearchBar
          searchTerm={filters.searchTerm}
          onSearchChange={filters.setSearchTerm}
        />

        {error && (
          <div className="error-message">
            Error loading courses: {error}
          </div>
        )}

        {loading ? (
          <div className="loading-message">
            <div className="loading-spinner" />
            <p>Loading course data...</p>
          </div>
        ) : (
          <div className="content-layout">
            {/* Desktop: FilterPanel on left */}
            <FilterPanel
              allInstitutions={data}
              selectedStates={filters.selectedStates}
              setSelectedStates={filters.setSelectedStates}
              selectedCities={filters.selectedCities}
              setSelectedCities={filters.setSelectedCities}
              selectedLevels={filters.selectedLevels}
              setSelectedLevels={filters.setSelectedLevels}
              selectedFields={filters.selectedFields}
              setSelectedFields={filters.setSelectedFields}
              durationFilter={filters.durationFilter}
              setDurationFilter={filters.setDurationFilter}
              feeMin={filters.feeMin}
              setFeeMin={filters.setFeeMin}
              feeMax={filters.feeMax}
              setFeeMax={filters.setFeeMax}
              feePeriod={filters.feePeriod}
              setFeePeriod={filters.setFeePeriod}
              includeFeeNotSpecified={filters.includeFeeNotSpecified}
              setIncludeFeeNotSpecified={filters.setIncludeFeeNotSpecified}
              workComponent={filters.workComponent}
              setWorkComponent={filters.setWorkComponent}
              foundationStudies={filters.foundationStudies}
              setFoundationStudies={filters.setFoundationStudies}
              selectedCategories={filters.selectedCategories}
              setSelectedCategories={filters.setSelectedCategories}
              activeFilterCount={filters.activeFilterCount}
              clearAllFilters={filters.clearAllFilters}
            />

            {/* Mobile: FilterModal bottom sheet */}
            <FilterModal
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
            >
              <FilterPanel
                allInstitutions={data}
                selectedStates={filters.selectedStates}
                setSelectedStates={filters.setSelectedStates}
                selectedCities={filters.selectedCities}
                setSelectedCities={filters.setSelectedCities}
                selectedLevels={filters.selectedLevels}
                setSelectedLevels={filters.setSelectedLevels}
                selectedFields={filters.selectedFields}
                setSelectedFields={filters.setSelectedFields}
                durationFilter={filters.durationFilter}
                setDurationFilter={filters.setDurationFilter}
                feeMin={filters.feeMin}
                setFeeMin={filters.setFeeMin}
                feeMax={filters.feeMax}
                setFeeMax={filters.setFeeMax}
                feePeriod={filters.feePeriod}
                setFeePeriod={filters.setFeePeriod}
                includeFeeNotSpecified={filters.includeFeeNotSpecified}
                setIncludeFeeNotSpecified={filters.setIncludeFeeNotSpecified}
                workComponent={filters.workComponent}
                setWorkComponent={filters.setWorkComponent}
                foundationStudies={filters.foundationStudies}
                setFoundationStudies={filters.setFoundationStudies}
                selectedCategories={filters.selectedCategories}
                setSelectedCategories={filters.setSelectedCategories}
                activeFilterCount={filters.activeFilterCount}
                clearAllFilters={filters.clearAllFilters}
                isMobileModal={true}
              />
            </FilterModal>

            <div className="content-area">
              {/* Mobile: Show Filters button + Filter counter */}
              <div className="content-area-mobile-header">
                <button
                  className="show-filters-btn"
                  onClick={() => setIsFilterOpen(true)}
                >
                  <span className="filter-icon">≡</span>
                  Filters
                  {filters.activeFilterCount > 0 && (
                    <span className="filter-badge">{filters.activeFilterCount}</span>
                  )}
                </button>
              </div>
              {filters.totalCourses === 0 ? (
                <div className="no-results-message">
                  <div className="no-results-icon">😔</div>
                  <h3>No courses found</h3>
                  <p>Try adjusting your search criteria or filters</p>
                  <button
                    className="clear-filters-action"
                    onClick={filters.clearAllFilters}
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                    <ResultBar
                      currentPage={filters.currentPage}
                      itemsPerPage={filters.itemsPerPage}
                      totalInstitutions={filters.totalInstitutions}
                      totalCourses={filters.totalCourses}
                      sortBy={filters.sortBy}
                      setSortBy={filters.setSortBy}
                      setItemsPerPage={filters.setItemsPerPage}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                    {filters.selectedCourses.length > 0 && !isAdminAuthenticated && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => setIsCompareDrawerOpen(!isCompareDrawerOpen)}
                          style={{
                            padding: '0 10px',
                            background: 'var(--primary-orange)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 8px rgba(199, 97, 60, 0.18)',
                            transition: 'all 0.2s ease',
                            fontSize: '11px',
                            height: '28px',
                            minWidth: '125px',
                            lineHeight: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          📊 Compare ({filters.selectedCourses.length})
                        </button>
                        <button
                          onClick={() => {
                            filters.clearSelectedCourses();
                            setIsCompareDrawerOpen(false);
                          }}
                          style={{
                            background: 'rgba(199, 97, 60, 0.12)',
                            color: 'var(--primary-orange)',
                            border: '1.5px solid var(--primary-orange)',
                            borderRadius: '5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '28px',
                            width: '28px',
                            minWidth: '28px',
                            padding: '0',
                            lineHeight: '28px',
                          }}
                          title="Close and clear all"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {filters.selectedCourses.length > 0 && isAdminAuthenticated && (
                      <button
                        className="compare-courses-btn"
                        onClick={() => setIsAdminPanelOpen(true)}
                        style={{
                          padding: '10px 16px',
                          background: 'var(--primary-orange)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          marginLeft: '16px',
                          boxShadow: '0 2px 8px rgba(199, 97, 60, 0.3)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(199, 97, 60, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(199, 97, 60, 0.3)';
                        }}
                      >
                        📋 Prepare Offer ({filters.selectedCourses.length})
                      </button>
                    )}
                    {wishlist.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => setIsWishlistDrawerOpen(!isWishlistDrawerOpen)}
                          style={{
                            padding: '0 10px',
                            background: '#E74C3C',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 8px rgba(231, 76, 60, 0.18)',
                            transition: 'all 0.2s ease',
                            fontSize: '11px',
                            height: '28px',
                            minWidth: '125px',
                            lineHeight: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ❤️ Wishlist ({wishlist.length})
                        </button>
                        <button
                          onClick={() => {
                            clearWishlist();
                            setIsWishlistDrawerOpen(false);
                          }}
                          style={{
                            background: 'rgba(231, 76, 60, 0.12)',
                            color: '#E74C3C',
                            border: '1.5px solid #E74C3C',
                            borderRadius: '5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '28px',
                            width: '28px',
                            minWidth: '28px',
                            padding: '0',
                            lineHeight: '28px',
                          }}
                          title="Close and clear all"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    </div>
                  </div>

                  <div className="results-container">
                    {filters.paginatedCourses.map((course) => (
                      <CourseCard
                        key={`${course.institution.providerCode}-${course.courseCode}`}
                        course={course}
                        institution={course.institution}
                        onCardClick={handleCardClick}
                        isSelected={filters.isCourseSelected(course, course.institution)}
                        onToggleSelect={filters.toggleCourseSelection}
                        isAdmin={isAdminAuthenticated}
                        isInWishlist={isInWishlist(course, course.institution)}
                        onToggleWishlist={toggleWishlist}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={filters.currentPage}
                    totalPages={filters.totalPages}
                    setCurrentPage={filters.setCurrentPage}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Data from{' '}
          <a
            href="https://cricos.deewr.gov.au/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CRICOS Register
          </a>
        </p>
      </footer>

      {/* Course Modal */}
      {selectedCourse && selectedInstitution && (
        <CourseModal
          course={selectedCourse}
          institution={selectedInstitution}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}

      {/* Compare Drawer - For Regular Users */}
      <CompareDrawer
        isOpen={isCompareDrawerOpen && !isAdminAuthenticated}
        selectedCourses={filters.selectedCourses}
        onRemoveCourse={filters.toggleCourseSelection}
        onClearSelection={filters.clearSelectedCourses}
        onClose={() => setIsCompareDrawerOpen(false)}
        notes={notes}
        onNoteChange={setNote}
        onNoteClear={clearNote}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={isWishlistDrawerOpen}
        wishlist={wishlist}
        onRemoveFromWishlist={toggleWishlist}
        onClearWishlist={clearWishlist}
        onClose={() => setIsWishlistDrawerOpen(false)}
      />

      {/* Admin Panel - Only for Admin Features */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        setIsOpen={setIsAdminPanelOpen}
        isAuthenticated={isAdminAuthenticated}
        onAuthChange={setIsAdminAuthenticated}
        selectedCourses={filters.selectedCourses}
        onClearSelection={filters.clearSelectedCourses}
      />
    </div>
  );
}

export default App;
