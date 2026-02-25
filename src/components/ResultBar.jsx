import '../styles/ResultBar.css';

export function ResultBar({
  currentPage,
  itemsPerPage,
  totalInstitutions,
  totalCourses,
  sortBy,
  setSortBy,
  setItemsPerPage
}) {
  const startIndex = totalCourses === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCourses);

  return (
    <div className="result-bar">
      <div className="result-info">
        {totalCourses === 0 ? (
          <span>No courses found</span>
        ) : (
          <span>
            Showing {startIndex}–{endIndex} of {totalCourses.toLocaleString()} courses ({totalInstitutions.toLocaleString()} institutions)
          </span>
        )}
      </div>

      <div className="result-controls">
        <div className="control-group">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="result-select"
          >
            <option value="name">Name (A-Z)</option>
            <option value="price">Price (Low-High)</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="items-select">Items per page:</label>
          <select
            id="items-select"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
            className="result-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}
