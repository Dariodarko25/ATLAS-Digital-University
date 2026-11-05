import { Link, Outlet } from 'react-router-dom'
import NavBar from './NavBar.jsx'
import SideBar from './SideBar.jsx'

const footerLinks = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/classroom', label: 'Classroom' },
  { to: '/lab', label: 'Lab' },
  { to: '/journey', label: 'Journey' },
  { to: '/profile', label: 'Profile' },
  { to: '/community', label: 'Community' },
  { to: '/onboarding', label: 'Onboarding' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-4 sm:px-6">
        <div className="py-6">
          <SideBar />
        </div>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <footer className="border-t border-[#6ea8ff1f] py-6 text-sm text-[#9aa3bd]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between">
          <p className="font-display text-base tracking-wide text-white">ATLAS</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {footerLinks.map(({ to, label }) => (
              <Link key={to} to={to} className="link-muted">
                {label}
              </Link>
            ))}
          </nav>
          <p>Learn by exploring. Understand by experimenting. Grow by creating.</p>
        </div>
      </footer>
    </div>
  )
}
