import { useMemo, useState } from 'react'
import { Battery, CheckCircle2, Lightbulb, RotateCcw, Zap } from 'lucide-react'

const TARGET_CURRENT = 0.5 // amps — the practical challenge goal
const TOLERANCE = 0.02

export default function Lab() {
  const [voltage, setVoltage] = useState(9)
  const [resistance, setResistance] = useState(100)

  const current = voltage / resistance
  const power = (voltage * voltage) / resistance

  const glow = useMemo(() => {
    // Map power (0..~5.76W max at 24V/100… actually 24V/10Ω = 57.6W) to 0..1 for visuals.
    const MAX_DISPLAY_POWER = 6
    return Math.min(1, power / MAX_DISPLAY_POWER)
  }, [power])

  const success = Math.abs(current - TARGET_CURRENT) <= TOLERANCE
  const bulbColor = `rgba(255, ${Math.round(200 + 55 * glow)}, 80, ${0.25 + 0.75 * glow})`

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Circuits Lab</h1>
        <p className="mt-1 text-sm text-muted-ink">
          Build a working circuit and feel Ohm&apos;s law with your own hands.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Circuit visual + controls */}
        <section className="card p-5 sm:p-6" aria-label="Circuit simulator">
          <svg
            viewBox="0 0 320 220"
            role="img"
            aria-label={`Circuit with ${voltage} volts, ${resistance} ohms, bulb glowing at ${(glow * 100).toFixed(0)} percent`}
            className="mb-4 h-auto w-full"
          >
            <defs>
              <filter id="bulb-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation={14 * glow + 1} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Wire loop */}
            <rect
              x="40"
              y="40"
              width="240"
              height="140"
              fill="none"
              stroke="#6ea8ff"
              strokeWidth="3"
              rx="12"
              opacity={0.35 + 0.65 * Math.min(1, current / 1)}
            />
            {/* Battery (left) */}
            <rect x="28" y="85" width="24" height="50" rx="4" fill="#0f1a3d" stroke="#22d3ee" strokeWidth="3" />
            <text x="40" y="77" textAnchor="middle" fill="#22d3ee" fontSize="12" fontWeight="bold">
              {voltage}V
            </text>
            <text x="40" y="150" textAnchor="middle" fill="#9aa3bd" fontSize="11">
              +
            </text>
            {/* Resistor (top) */}
            <rect x="125" y="28" width="70" height="24" rx="6" fill="#0f1a3d" stroke="#a78bfa" strokeWidth="3" />
            <text x="160" y="21" textAnchor="middle" fill="#a78bfa" fontSize="12" fontWeight="bold">
              {resistance} Ω
            </text>
            {/* Bulb (right) */}
            <g filter="url(#bulb-glow)">
              <circle cx="280" cy="110" r="22" fill={bulbColor} stroke="#ffd250" strokeWidth="3" />
            </g>
            <text x="280" y="155" textAnchor="middle" fill="#9aa3bd" fontSize="11">
              Bulb
            </text>
            {/* Current label */}
            <text x="160" y="205" textAnchor="middle" fill="#eef1f8" fontSize="14" fontWeight="bold">
              I = {current < 0.01 ? current.toFixed(4) : current.toFixed(3)} A
            </text>
          </svg>

          {/* Sliders */}
          <div className="space-y-5">
            <div>
              <label htmlFor="voltage" className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Battery className="h-4 w-4 text-pulse" />
                Voltage: {voltage} V
              </label>
              <input
                id="voltage"
                type="range"
                min="1"
                max="24"
                step="1"
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                className="w-full accent-[#22d3ee]"
              />
              <div className="flex justify-between text-xs text-muted-ink">
                <span>1 V</span>
                <span>24 V</span>
              </div>
            </div>
            <div>
              <label htmlFor="resistance" className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-spark" />
                Resistance: {resistance} Ω
              </label>
              <input
                id="resistance"
                type="range"
                min="10"
                max="1000"
                step="10"
                value={resistance}
                onChange={(e) => setResistance(Number(e.target.value))}
                className="w-full accent-[#a78bfa]"
              />
              <div className="flex justify-between text-xs text-muted-ink">
                <span>10 Ω</span>
                <span>1000 Ω</span>
              </div>
            </div>
          </div>

          {/* Live readings */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-navy-950 p-4 text-center">
              <p className="text-xs text-muted-ink">Current (I = V / R)</p>
              <p className="mt-1 text-2xl font-bold text-electric-soft">
                {(current * 1000).toFixed(1)} <span className="text-sm font-normal">mA</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-navy-950 p-4 text-center">
              <p className="text-xs text-muted-ink">Power (P = V² / R)</p>
              <p className="mt-1 text-2xl font-bold text-[#ffd250]">
                {power.toFixed(2)} <span className="text-sm font-normal">W</span>
              </p>
            </div>
          </div>
        </section>

        {/* Explanation + challenge */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Lightbulb className="h-4 w-4 text-[#ffd250]" />
              What is happening?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-ink">
              The battery pushes electric charge around the loop, the resistor limits how
              much flows, and the bulb turns that energy into light. Ohm&apos;s law ties
              them together: <strong className="text-parchment">I = V / R</strong> — raise
              the voltage and more current flows; raise the resistance and less flows.
              The bulb&apos;s brightness follows the power it receives:{' '}
              <strong className="text-parchment">P = V² / R</strong>. More power, more glow.
            </p>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Zap className="h-4 w-4 text-pulse" />
              Challenge: hit the target current
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-ink">
              Adjust the voltage and resistance sliders until the current reads exactly{' '}
              <strong className="text-parchment">{TARGET_CURRENT} A (500 mA)</strong>, within{' '}
              {TOLERANCE * 1000} mA. Hint: pick a voltage, then solve R = V / I.
            </p>
            <div
              className={`mt-4 rounded-xl border p-4 text-center text-sm font-semibold ${
                success
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 bg-navy-950 text-muted-ink'
              }`}
              role="status"
              aria-live="polite"
            >
              {success ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Circuit complete! {TARGET_CURRENT} A achieved — brilliant engineering.
                </span>
              ) : (
                <>
                  Current: {(current * 1000).toFixed(1)} mA — target: 500 mA. Keep tuning!
                </>
              )}
            </div>
            <button
              onClick={() => {
                setVoltage(9)
                setResistance(100)
              }}
              className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-navy-800 px-4 py-2 text-sm transition hover:border-electric/50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset circuit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
