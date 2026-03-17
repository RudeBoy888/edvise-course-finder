import '../styles/SearchBar.css';

export function SearchBar({ searchTerm, onSearchChange, children }) {
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
      {children}
    </div>
  );
}
