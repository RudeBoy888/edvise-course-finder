import '../styles/EvidenceLevelBadge.css';

const TOOLTIPS = {
  streamlined: 'No additional financial or English evidence required for this passport country at this institution.',
  regular: 'Evidence of financial capacity and English language ability required for this passport country.',
  unknown: 'Visa compatibility not yet checked for this institution.',
};

export function EvidenceLevelBadge({ compatibility }) {
  if (!compatibility || compatibility === 'unknown') {
    return (
      <span
        className="evidence-badge evidence-badge--unknown"
        title={TOOLTIPS.unknown}
      >
        ? Not checked
      </span>
    );
  }

  if (compatibility === 'streamlined') {
    return (
      <span className="evidence-badge evidence-badge--streamlined" title={TOOLTIPS.streamlined}>
        Streamlined
      </span>
    );
  }

  return (
    <span className="evidence-badge evidence-badge--regular" title={TOOLTIPS.regular}>
      Extra docs required
    </span>
  );
}
