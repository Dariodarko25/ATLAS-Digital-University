import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Bell, Compass, FlaskConical, GraduationCap, Home, LogIn, LogOut, Map, Menu, Orbit, User, Users, X } from 'lucide-react'
import { milestones } from '../data/mockData.js'
import { useAuth } from '../context/AuthContext.jsx'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { ONBOARDING_KEY, emptyProfile } from '../services/storage.js'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/classroom', label: 'Classroom', icon: GraduationCap },
  { to: '/lab', label: 'Lab', icon: FlaskConical },
  { to: '/journey', label: 'Journey', icon: Map },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/community', label: 'Community', icon: Users },
]

const pendingMilestones = milestones.filter((m) => !m.completed).length

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [profile] = useLocalStorage(ONBOARDING_KEY, emptyProfile)
  const { user, loading, signOut } = useAuth()
  const displayName = profile?.name?.trim() || user?.email?.split('@')[0] || 'Student'

  return (
    <header className="sticky top-0 z-40 border-b border-[#6ea8ff29] bg-[#050914ee] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4">
        <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2e7bff] to-[#16245a] shadow-[0_0_18px_rgba(46,123,255,0.5)]">
            <Orbit size={20} className="text-white" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-lg font-bold tracking-wide">ATLAS</span>
            <span className="hidden text-[10px] tracking-widest text-[#9aa3bd] uppercase sm:block">
              Digital University
            </span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2e7bff] text-white shadow-[0_0_18px_rgba(46,123,255,0.55)]'
                    : 'link-muted hover:bg-[#6ea8ff14] hover:text-white'
                }`
              }
            >
              <Icon size={16} aria-hidden="true" />
              <span className="hidden xl:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/journey"
            aria-label={`${pendingMilestones} milestones to reach`}
            className="relative rounded-full p-2 text-[#9aa3bd] transition-colors hover:bg-[#6ea8ff14] hover:text-white"
          >
            <Bell size={19} aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#f5b942] px-1 text-[10px] font-bold text-[#050914]">
              {pendingMilestones}
            </span>
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-full border border-[#6ea8ff2e] bg-[#0f1a3d88] py-1 pr-3 pl-1 transition-colors hover:border-[#6ea8ff66] sm:flex"
              >
                <span
                  className="font-display flex h-7 w-7 items-center justify-center rounded-full bg-[#2e7bff] text-sm font-bold text-white"
                  aria-hidden="true"
                >
                  {displayName[0]?.toUpperCase() ?? 'S'}
                </span>
                <span className="max-w-28 truncate text-sm font-medium">{displayName}</span>
              </Link>
              <button
                onClick={() => signOut().catch(() => {})}
                aria-label="Sign out"
                title="Sign out"
                className="hidden rounded-full p-2 text-[#9aa3bd] transition-colors hover:bg-[#6ea8ff14] hover:text-white sm:block"
              >
                <LogOut size={19} aria-hidden="true" />
              </button>
            </>
          ) : (
            !loading && (
              <Link
                to="/login"
                className="btn-primary hidden items-center gap-1.5 px-4 py-2 text-sm sm:flex"
              >
                <LogIn size={16} aria-hidden="true" /> Sign in
              </Link>
            )
          )}
          <button
            className="rounded-lg p-2 text-[#9aa3bd] hover:text-white lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[#6ea8ff1f] px-4 py-3 lg:hidden" aria-label="Mobile">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-[#2e7bff26] text-white' : 'link-muted'
                }`
              }
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/onboarding"
            onClick={() => setOpen(false)}
            className="btn-primary mt-2 block px-4 py-2.5 text-center text-sm"
          >
            Get started
          </NavLink>
          {user ? (
            <button
              onClick={() => {
                setOpen(false)
                signOut().catch(() => {})
              }}
              className="link-muted mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              <LogOut size={17} aria-hidden="true" /> Sign out
            </button>
          ) : (
            !loading && (
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="link-muted mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                <LogIn size={17} aria-hidden="true" /> Sign in
              </NavLink>
            )
          )}
        </nav>
      )}
    </header>
  )
}
