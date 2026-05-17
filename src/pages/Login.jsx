import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, homePath } from '../auth.jsx'
import { api } from '../api.js'
import { I } from '../helix/icons.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('mobile') // mobile | otp
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [hint, setHint] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function requestOtp(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api.post('/auth/request-otp', { mobile })
      if (!r.exists) {
        setErr('No account for this number. Please sign up first.')
      } else {
        setHint(`Demo OTP for ${mobile}: use ${r.mockOtp}`)
        setStep('otp')
      }
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const r = await api.post('/auth/verify-otp', { mobile, otp })
      signIn(r.token, r.user)
      navigate(homePath(r.user.role))
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="aqua-shell hx-bg-mesh">
      <main className="aqua-page narrow" style={{ paddingTop: 56 }}>
        <div className="center" style={{ textAlign: 'center', marginBottom: 22 }}>
          <Link to="/" className="brand-mark" style={{
            width: 46, height: 46, margin: '0 auto', borderRadius: 13
          }}>
            <I.Waves size={24} />
          </Link>
          <h2 style={{ margin: '14px 0 4px' }}>Welcome back</h2>
          <p className="p-sm muted" style={{ margin: 0 }}>
            Your mobile number is your AquaLife identity.
          </p>
        </div>

        {err && (
          <div className="hx-callout hx-callout-danger" style={{ marginBottom: 14 }}>
            <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
          </div>
        )}
        {hint && step === 'otp' && (
          <div className="hx-callout hx-callout-info" style={{ marginBottom: 14 }}>
            <I.Info size={16} className="hx-callout-icon" /><div>{hint}</div>
          </div>
        )}

        <div className="hx-card">
          <div className="hx-card-body">
            {step === 'mobile' && (
              <form onSubmit={requestOtp} className="stack">
                <div>
                  <label className="hx-label">Mobile number</label>
                  <div className="hx-input-group">
                    <I.Phone size={15} />
                    <input className="hx-input" value={mobile} inputMode="numeric" maxLength={10}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile" />
                  </div>
                </div>
                <button className="hx-btn hx-btn-primary hx-btn-lg" style={{ width: '100%' }}
                  data-loading={busy ? 'true' : undefined} disabled={busy || mobile.length !== 10}>
                  Send OTP
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={verifyOtp} className="stack">
                <div>
                  <label className="hx-label">Enter OTP sent to {mobile}</label>
                  <input className="hx-input" value={otp} inputMode="numeric" maxLength={4}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-digit OTP" style={{ letterSpacing: '0.4em', textAlign: 'center' }} />
                </div>
                <button className="hx-btn hx-btn-primary hx-btn-lg" style={{ width: '100%' }}
                  data-loading={busy ? 'true' : undefined} disabled={busy || otp.length !== 4}>
                  Verify &amp; sign in
                </button>
                <button type="button" className="hx-btn hx-btn-ghost hx-btn-sm"
                  onClick={() => { setStep('mobile'); setOtp(''); setErr('') }}>
                  <I.ArrowLeft size={14} /> Change number
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="center p-sm muted" style={{ textAlign: 'center', marginTop: 16 }}>
          New to AquaLife? <Link to="/signup">Create a membership</Link>
        </p>
      </main>
    </div>
  )
}
