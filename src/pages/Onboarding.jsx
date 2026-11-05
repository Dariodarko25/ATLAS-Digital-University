import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Cpu,
  FlaskConical,
  Microscope,
  Palette,
  Sigma,
  Target,
  Trophy,
  Wrench,
} from 'lucide-react'
import { categories } from '../data/mockData.js'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { ONBOARDING_KEY, emptyProfile } from '../services/storage.js'

const categoryIcons = {
  Science: FlaskConical,
  Technology: Cpu,
  Engineering: Wrench,
  Mathematics: Sigma,
  'Arts & Humanities': Palette,
}

const goals = [
  { label: 'Build strong foundations', icon: Target },
  { label: 'Go deep on one subject', icon: Microscope },
  { label: 'Explore many ideas', icon: Compass },
  { label: 'Prepare for a challenge', icon: Trophy },
]

const steps = ['Your name', 'Interests', 'Goal']

export default function Onboarding() {
  const [stored, setStored] = useLocalStorage(ONBOARDING_KEY, emptyProfile)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(stored?.name ?? '')
  const [interests, setInterests] = useState(stored?.interests ?? [])
  const [goal, setGoal] = useState(stored?.goal ?? '')
  const navigate = useNavigate()

  const toggleInterest = (category) => {
    setInterests((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const stepValid =
    step === 0 ? name.trim().length > 0 : step === 1 ? interests.length > 0 : goal !== ''

  const finish = () => {
    setStored({
      name: name.trim(),
      interests,
      goal,
      completedAt: new Date().toISOString(),
    })
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-[#9aa3bd]">
        {stored?.completedAt ? 'Update your learning profile' : 'Begin your journey'}
      </p>
      <h1 className="font-display mt-1 text-3xl sm:text-4xl">Three quick questions</h1>

      {/* Progress */}
      <div className="mt-6">
        <ol className="flex items-center gap-2" aria-label="Onboarding progress">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index < step
                    ? 'bg-[#22d3ee] text-[#050914]'
                    : index === step
                      ? 'bg-[#2e7bff] text-white'
                      : 'bg-[#6ea8ff22] text-[#9aa3bd]'
                }`}
                aria-current={index === step ? 'step' : undefined}
              >
                {index < step ? <Check size={14} /> : index + 1}
              </span>
              <span
                className={`hidden text-sm sm:inline ${index === step ? 'text-white' : 'text-[#9aa3bd]'}`}
              >
                {label}
              </span>
              {index < steps.length - 1 && (
                <span className="mx-1 h-px flex-1 bg-[#6ea8ff2e]" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="card mt-6 p-6 sm:p-8">
        {step === 0 && (
          <div>
            <label htmlFor="onboarding-name" className="font-display text-xl">
              What should your teachers call you?
            </label>
            <p className="mt-1.5 text-sm text-[#9aa3bd]">
              This personalizes your dashboard greeting.
            </p>
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && stepValid && setStep(1)}
              placeholder="e.g. Nova"
              autoComplete="given-name"
              autoFocus
              maxLength={40}
              className="mt-4 w-full rounded-[10px] border border-[#6ea8ff33] bg-[#0a1128] px-4 py-2.5 text-[15px] text-white placeholder:text-[#9aa3bd88] focus:border-[#6ea8ff88] focus:outline-none"
            />
          </div>
        )}

        {step === 1 && (
          <fieldset>
            <legend className="font-display text-xl">Which subjects pull you in?</legend>
            <p className="mt-1.5 text-sm text-[#9aa3bd]">
              Pick at least one — your recommendations follow these.
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {categories.map((category) => {
                const Icon = categoryIcons[category] ?? Compass
                const active = interests.includes(category)
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleInterest(category)}
                    aria-pressed={active}
                    className={`flex items-center gap-2.5 rounded-[10px] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active
                        ? 'border-[#2e7bff] bg-[#2e7bff26] text-white'
                        : 'border-[#6ea8ff2e] text-[#c6cddd] hover:border-[#6ea8ff66]'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-[#6ea8ff]' : 'text-[#9aa3bd]'} />
                    {category}
                    {active && <Check size={16} className="ml-auto text-[#6ea8ff]" />}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset>
            <legend className="font-display text-xl">What is your main goal?</legend>
            <p className="mt-1.5 text-sm text-[#9aa3bd]">
              One focus for now — you can change it any time.
            </p>
            <div className="mt-4 grid gap-2.5">
              {goals.map(({ label, icon: Icon }) => {
                const active = goal === label
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setGoal(label)}
                    aria-pressed={active}
                    className={`flex items-center gap-2.5 rounded-[10px] border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      active
                        ? 'border-[#22d3ee] bg-[#22d3ee1a] text-white'
                        : 'border-[#6ea8ff2e] text-[#c6cddd] hover:border-[#6ea8ff66]'
                    }`}
                  >
                    <Icon size={18} className={active ? 'text-[#22d3ee]' : 'text-[#9aa3bd]'} />
                    {label}
                    {active && <Check size={16} className="ml-auto text-[#22d3ee]" />}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* Nav buttons */}
        <div className="mt-7 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="link-muted flex items-center gap-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={15} /> Back
          </button>
          {step < 2 ? (
            <button
              onClick={() => stepValid && setStep((s) => s + 1)}
              disabled={!stepValid}
              className="btn-primary flex items-center gap-1.5 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={!stepValid}
              className="btn-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start learning
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-[#9aa3bd]">
        <Link to="/" className="underline underline-offset-4 hover:text-white">
          Skip for now
        </Link>
      </p>
    </div>
  )
}
