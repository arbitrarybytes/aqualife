import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { I } from '../helix/icons.jsx'
import { Avatar } from '../ui.jsx'

const NAV = {
  member: [
    { to: '/member', label: 'Dashboard', icon: 'Home' },
    { to: '/member/checkin', label: 'Check in', icon: 'Scan' }
  ],
  attendant: [
    { to: '/attendant', label: 'Check-in Desk', icon: 'Activity' }
  ],
  admin: [
    { to: '/admin', label: 'Operations', icon: 'TrendingUp' },
    { to: '/attendant', label: 'Check-in Desk', icon: 'Activity' }
  ]
}

export function applyTheme(theme) {
  const el = document.documentElement
  el.classList.toggle('hx-dark', theme === 'dark')
  el.classList.toggle('hx-light', theme === 'light')
  localStorage.setItem('aqua_theme', theme)
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => localStorage.getItem('aqua_theme') || 'dark')
  const tabs = NAV[user?.role] || []

  useEffect(() => { applyTheme(theme) }, [theme])

  return (
    <div className="aqua-shell">
      <div className="aqua-nav">
        <nav className="hx-navbar">
          <div className="hx-navbar-brand">
            <span className="brand-mark"><I.Waves size={19} /></span>
            <span className="brand-text">
              <b>AquaLife</b>
              <span>Membership Platform</span>
            </span>
          </div>

          <div className="aqua-tabs">
            {tabs.map(t => {
              const Icon = I[t.icon]
              return (
                <NavLink key={t.to} to={t.to} end
                  className={({ isActive }) => 'hx-nav-item' + (isActive ? ' active' : '')}>
                  <Icon className="hx-nav-icon" size={15} />
                  <span className="aqua-hide-sm">{t.label}</span>
                </NavLink>
              )
            })}
          </div>

          <div className="aqua-navspace" />

          <button className="hx-iconbtn" title="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <I.Sun size={16} /> : <I.Moon size={16} />}
          </button>

          {user && (
            <div className="hx-navbar-user" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={user.name} size={30} />
              <div className="aqua-hide-sm" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{user.name}</div>
                <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hx-fg-subtle)' }}>
                  {user.role}
                </div>
              </div>
              <button className="hx-btn hx-btn-ghost hx-btn-sm"
                onClick={() => { signOut(); navigate('/') }}>
                <I.Logout size={15} />
              </button>
            </div>
          )}
        </nav>
      </div>

      <main className="aqua-main">{children}</main>
    </div>
  )
}
