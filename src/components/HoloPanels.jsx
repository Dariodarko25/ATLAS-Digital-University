import { Atom, Cpu, Dna } from 'lucide-react'

// Floating holographic data screens (decorative, CSS-animated): the command-lab
// atmosphere behind the dashboard hero. Hidden on small screens to avoid
// crowding the welcome content.
const PANELS = [
  {
    icon: Atom,
    title: 'QUANTUM FIELD',
    position: 'left-[3%] top-[10%]',
    delay: '0s',
    bars: ['0s', '0.5s', '1.1s'],
  },
  {
    icon: Dna,
    title: 'BIO MATRIX',
    position: 'left-[37%] top-[5%]',
    delay: '1.6s',
    bars: ['0.8s', '0.2s', '1.4s'],
  },
  {
    icon: Cpu,
    title: 'NEURAL CORE',
    position: 'right-[3%] top-[7%]',
    delay: '3s',
    bars: ['1.2s', '0.6s', '0s'],
  },
]

export default function HoloPanels() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden xl:block">
      {PANELS.map(({ icon: Icon, title, position, delay, bars }) => (
        <div key={title} className={`holo-panel avatar-float ${position}`} style={{ animationDelay: delay }}>
          <div className="flex items-center gap-2">
            <Icon size={14} className="shrink-0 text-[#22d3ee]" />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#9fd8ff]">{title}</span>
            <span className="live-dot ml-auto" />
          </div>
          <div className="mt-2.5 space-y-1.5">
            {bars.map((barDelay, i) => (
              <div key={i} className="hud-bar" style={{ animationDelay: barDelay }} />
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <span className="h-4 flex-1 rounded-sm bg-[#6ea8ff1f]" />
            <span className="h-4 flex-1 rounded-sm bg-[#22d3ee26]" />
            <span className="h-4 flex-1 rounded-sm bg-[#6ea8ff1f]" />
          </div>
        </div>
      ))}
    </div>
  )
}
