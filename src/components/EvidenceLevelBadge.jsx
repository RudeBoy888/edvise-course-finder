import '../styles/EvidenceLevelBadge.css';

function buildTooltip(base, providerLevel, countryLevel) {
  if (providerLevel != null && countryLevel != null) {
    return `${base} | School: L${providerLevel} · Country: L${countryLevel}`;
  }
  return base;
}

export function EvidenceLevelBadge({ compatibility, providerLevel, countryLevel }) {
  if (!compatibility || compatibility === 'unknown') {
    return (
      <span
        className="evidence-badge evidence-badge--unknown"
        title={buildTooltip('Visa compatibility not yet checked for this institution.', providerLevel, countryLevel)}
      >
        ? Not checked
      </span>
    );
  }

  if (compatibility === 'streamlined') {
    return (
      <span
        className="evidence-badge evidence-badge--streamlined"
        title={buildTooltip('No additional financial or English evidence required for this passport country at this institution.', providerLevel, countryLevel)}
      >
        Streamlined
      </span>
    );
  }

  return (
    <span
      className="evidence-badge evidence-badge--regular"
      title={buildTooltip('Evidence of financial capacity and English language ability required for this passport country.', providerLevel, countryLevel)}
    >
      Extra docs required
    </span>
  );
}
