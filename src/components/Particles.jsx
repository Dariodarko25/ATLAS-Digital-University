import { useMemo } from 'react'

// Lightweight ambient particle field: a fixed set of dots animated with pure
// CSS (no JS loop, no canvas) so it stays cheap on modest hardware.
export default function Particles({ count = 22, className = '' }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const color = i % 3 === 0 ? '#22d3ee' : '#6ea8ff'
        return {
          id: i,
          left: `${(i * 37 + 11) % 100}%`,
          top: `${(i * 53 + 7) % 100}%`,
          size: 2 + ((i * 7) % 3),
          duration: `${6 + ((i * 13) % 8)}s`,
          delay: `${-((i * 29) % 10)}s`,
          color,
        }
      }),
    [count],
  )

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="particle"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
            boxShadow: `0 0 8px 1px ${dot.color}`,
            animationDuration: dot.duration,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>
  )
}
