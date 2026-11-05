import { NavLink } from 'react-router-dom'
import { Compass, FlaskConical, GraduationCap, Home, Map, Orbit, User, Users } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: Home, end: true },
  { to: '/explore', label: 'My Courses', icon: Compass },
  { to: '/lab', label: 'Laboratory', icon: FlaskConical },
  { to: '/classroom', label: 'AI Teachers', icon: GraduationCap },
  { to: '/journey', label: 'Journey', icon: Map },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/community', label: 'Community', icon: Users },
]

export default function SideBar() {
  return (
    <aside className="sticky top-24 hidden h-fit w-60 shrink-0 lg:block" aria-label="Secondary">
      <nav className="card flex flex-col gap-1 p-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#2e7bff26] text-white shadow-[inset_3px_0_0_#2e7bff]'
                  : 'link-muted hover:bg-[#6ea8ff14] hover:text-white'
              }`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="card mt-4 flex flex-col items-center gap-2.5 p-5 text-center">
        <Orbit size={30} className="text-[#2e7bff]" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-[#9aa3bd] italic">
          Learn today,
          <br />
          create tomorrow.
        </p>
      </div>
    </aside>
  )
}
