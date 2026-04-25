import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, DollarSign, CalendarDays, Warehouse, LogOut, Waves,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workers',   icon: Users,           label: 'Workers'   },
  { to: '/payroll',   icon: DollarSign,      label: 'Payroll'   },
  { to: '/roster',    icon: CalendarDays,    label: 'Roster'    },
  { to: '/sheds',     icon: Warehouse,       label: 'Sheds'     },
]

export default function Layout() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-sand-50">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-ocean-900 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-ocean-700">
          <div className="w-9 h-9 rounded-xl bg-sand-400 flex items-center justify-center">
            <Waves size={18} className="text-ocean-900" />
          </div>
          <div>
            <p className="font-display text-white text-sm leading-tight">Beach Facility</p>
            <p className="text-ocean-300 text-xs">Manager</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ocean-700 text-white'
                    : 'text-ocean-300 hover:bg-ocean-800 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-ocean-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-ocean-300 hover:bg-ocean-800 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
