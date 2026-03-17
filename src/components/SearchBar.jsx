import '../styles/SearchBar.css';

export function SearchBar({ searchTerm, onSearchChange, searchMode, onSearchModeChange, children }) {
  const handleSearchInput = (e) => {
    const value = e.target.value;
    onSearchChange(value);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search course..."
        value={searchTerm}
        onChange={handleSearchInput}
        className="search-input"
        aria-label="Search courses"
      />
      <div className="search-mode-toggle">
        <button
          className={`toggle-btn ${searchMode === 'every' ? 'active' : ''}`}
          onClick={() => onSearchModeChange('every')}
        >All words</button>
        <button
          className={`toggle-btn ${searchMode === 'some' ? 'active' : ''}`}
          onClick={() => onSearchModeChange('some')}
        >Any word</button>
      </div>
      {children}
    </div>
  );
}
