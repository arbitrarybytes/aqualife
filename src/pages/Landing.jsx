import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, homePath } from '../auth.jsx'
import { api } from '../api.js'
import { I } from '../helix/icons.jsx'
import { Avatar } from '../ui.jsx'

// Seeded accounts — one-tap login for demos (OTP is mocked as 1234).
const DEMO_ACCOUNTS = [
  { mobile: '9810000001', name: 'Aarav Sharma', tag: 'Member · Wave plan · family of 3', role: 'member' },
  { mobile: '9810000002', name: 'Kabir Nair', tag: 'Member · Splash plan · low balance', role: 'member' },
  { mobile: '9000000002', name: 'Ravi Kumar', tag: 'Attendant · AquaLife Andheri', role: 'attendant' },
  { mobile: '9000000003', name: 'Meena Joshi', tag: 'Attendant · AquaLife Koramangala', role: 'attendant' },
  { mobile: '9000000001', name: 'Ops Admin', tag: 'Admin · all facilities', role: 'admin' }
]

const FEATURES = [
  { icon: 'QrCode', title: 'QR membership cards',
    desc: 'Every member carries a scannable card — on a printed card or their phone.' },
  { icon: 'Users', title: 'Family-aware plans',
    desc: 'Plans cover the whole family. Each named member is tracked on every visit.' },
  { icon: 'Activity', title: 'Rush-proof check-in',
    desc: 'Members pick who is visiting; attendants confirm in one tap — never re-counting.' }
]

export default function Landing() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')

  async function quickLogin(mobile) {
    setBusy(mobile)
    setErr('')
    try {
      const r = await api.post('/auth/verify-otp', { mobile, otp: '1234' })
      signIn(r.token, r.user)
      navigate(homePath(r.user.role))
    } catch (e) {
      setErr(e.message)
      setBusy(null)
    }
  }

  return (
    <div className="aqua-shell">
      <header className="aqua-hero hx-bg-mesh">
        <div className="aqua-hero-inner">
          <span className="brand-mark" style={{ width: 48, height: 48, margin: '0 auto', borderRadius: 14 }}>
            <I.Waves size={26} />
          </span>
          <div className="hx-eyebrow" style={{ justifyContent: 'center', marginTop: 18 }}>
            Pool Membership SaaS
          </div>
          <h1>The <span className="text-grad">calm</span> way to run a swimming pool</h1>
          <p>
            One platform for members and attendants. Subscribe to a plan, carry a QR card,
            and check in your family — while attendants confirm visits without ever
            mis-counting heads at the busiest hour.
          </p>
          <div className="aqua-row wrap" style={{ justifyContent: 'center', marginTop: 24 }}>
            <Link className="hx-btn hx-btn-primary hx-btn-lg" to="/signup">
              <I.UserPlus size={17} /> Become a member
            </Link>
            <Link className="hx-btn hx-btn-secondary hx-btn-lg" to="/login">
              Sign in <I.ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="aqua-page mid">
        {user && (
          <div className="hx-callout hx-callout-success" style={{ marginBottom: 20 }}>
            <I.Success size={16} className="hx-callout-icon" />
            <div>
              Signed in as <strong>{user.name}</strong>.{' '}
              <Link to={homePath(user.role)}>Go to your {user.role} workspace →</Link>
            </div>
          </div>
        )}

        <div className="aqua-grid-3" style={{ marginBottom: 28 }}>
          {FEATURES.map(f => {
            const Icon = I[f.icon]
            return (
              <div className="hx-card hx-card-rise" key={f.title}>
                <div className="hx-card-body stack-sm">
                  <span className="brand-mark" style={{ borderRadius: 10 }}>
                    <Icon size={17} />
                  </span>
                  <div style={{ fontWeight: 600 }}>{f.title}</div>
                  <div className="p-sm muted">{f.desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="hx-eyebrow" style={{ marginBottom: 10 }}>Try the live demo</div>
        {err && (
          <div className="hx-callout hx-callout-danger" style={{ marginBottom: 12 }}>
            <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
          </div>
        )}
        <div className="hx-card">
          <div className="hx-card-header">
            <div className="hx-card-header-text">
              <div className="hx-card-title">Instant role login</div>
              <div className="hx-card-subtitle">No password — OTP is mocked as 1234</div>
            </div>
          </div>
          <div className="hx-card-body" style={{ padding: '4px 16px' }}>
            {DEMO_ACCOUNTS.map(a => (
              <div className="aqua-listrow" key={a.mobile}>
                <Avatar name={a.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{a.name}</div>
                  <div className="p-sm subtle">{a.tag}</div>
                </div>
                <button className="hx-btn hx-btn-primary hx-btn-sm"
                  data-loading={busy === a.mobile ? 'true' : undefined}
                  disabled={busy === a.mobile}
                  onClick={() => quickLogin(a.mobile)}>
                  Enter <I.ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="hx-callout hx-callout-info" style={{ marginTop: 16 }}>
          <I.Sparkles size={16} className="hx-callout-icon" />
          <div>
            <strong>The rush-hour fix.</strong> Members select exactly who is visiting from
            their own family roster. The attendant sees a named list with a pre-computed
            headcount — they verify faces and tap <strong>Confirm</strong>, never counting by hand.
          </div>
        </div>
      </main>
    </div>
  )
}
