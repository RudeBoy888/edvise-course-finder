import '../styles/StateBadge.css';

export function StateBadge({ state, isSelected, onClick }) {
  return (
    <button
      className={`state-badge ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={`Filter by ${state}`}
    >
      {state}
    </button>
  );
}
