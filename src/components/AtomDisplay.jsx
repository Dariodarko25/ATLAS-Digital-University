// Atom diagram for the classroom wall screen: nucleus with three orbiting
// electrons on rotating elliptical paths (one CSS rotation animation).
export default function AtomDisplay({ accent = '#22d3ee', className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="presentation" aria-hidden="true">
      <circle cx="100" cy="100" r="94" fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 8" />
      <g className="spin-slow-svg" fill="none" stroke={accent} strokeWidth="1.6">
        <ellipse cx="100" cy="100" rx="78" ry="30" strokeOpacity="0.85" />
        <ellipse cx="100" cy="100" rx="78" ry="30" strokeOpacity="0.6" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="78" ry="30" strokeOpacity="0.6" transform="rotate(120 100 100)" />
      </g>
      <circle cx="178" cy="100" r="4" fill={accent} />
      <circle cx="61" cy="168" r="4" fill={accent} opacity="0.8" />
      <circle cx="61" cy="32" r="4" fill={accent} opacity="0.8" />
      <circle cx="100" cy="100" r="13" fill={accent} opacity="0.25" />
      <circle cx="100" cy="100" r="7" fill={accent} />
      <circle cx="100" cy="100" r="2.6" fill="#050914" />
    </svg>
  )
}
