// Holographic wireframe globe rendered as inline SVG: meridians rotate slowly
// (one CSS animation) above a glowing pedestal beam. No images, no canvas.
export default function HoloGlobe({ className = '' }) {
  return (
    <div aria-hidden="true" className={className}>
      <svg viewBox="0 0 200 220" className="h-full w-full" role="presentation">
        <defs>
          <radialGradient id="holo-fill" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#2e7bff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2e7bff" stopOpacity="0.02" />
          </radialGradient>
          <linearGradient id="holo-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* pedestal beam */}
        <rect x="97" y="168" width="6" height="34" fill="url(#holo-beam)" opacity="0.8" />
        <ellipse cx="100" cy="206" rx="46" ry="7" fill="#22d3ee" opacity="0.28" />
        <ellipse cx="100" cy="204" rx="30" ry="4" fill="#22d3ee" opacity="0.45" />

        {/* globe body */}
        <circle cx="100" cy="96" r="70" fill="url(#holo-fill)" />
        <circle cx="100" cy="96" r="70" fill="none" stroke="#22d3ee" strokeOpacity="0.85" strokeWidth="1.6" />

        {/* rotating meridians */}
        <g className="spin-slow-svg" fill="none" stroke="#6ea8ff" strokeOpacity="0.75" strokeWidth="1">
          <ellipse cx="100" cy="96" rx="70" ry="26" />
          <ellipse cx="100" cy="96" rx="26" ry="70" />
          <ellipse cx="100" cy="96" rx="62" ry="62" strokeDasharray="3 7" />
        </g>

        {/* static parallels */}
        <g fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeWidth="1">
          <ellipse cx="100" cy="66" rx="52" ry="12" />
          <ellipse cx="100" cy="96" rx="70" ry="14" />
          <ellipse cx="100" cy="126" rx="52" ry="12" />
        </g>

        {/* orbit satellite */}
        <circle cx="158" cy="52" r="3" fill="#a78bfa" />
        <circle cx="158" cy="52" r="6" fill="none" stroke="#a78bfa" strokeOpacity="0.6" />
      </svg>
    </div>
  )
}
