import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { api } from '../api.js'
import { inr } from '../ui.jsx'
import { I } from '../helix/icons.jsx'

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Other']
const STEPS = ['Your details', 'Family', 'Plan', 'Payment']

export default function Signup() {
  const { signIn, refresh } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const [facilities, setFacilities] = useState([])
  const [plans, setPlans] = useState([])

  const [account, setAccount] = useState({ name: '', mobile: '', email: '', homeFacilityCode: '' })
  const [family, setFamily] = useState([])
  const [planId, setPlanId] = useState(null)
  const [customVisits, setCustomVisits] = useState(20)
  const [payment, setPayment] = useState({ method: 'upi' })
  const [done, setDone] = useState(null)

  useEffect(() => {
    api.get('/facilities').then(setFacilities).catch(() => {})
    api.get('/plans').then(p => {
      setPlans(p)
      const first = p.find(x => !x.isCustom)
      if (first) setPlanId(first.id)
    }).catch(() => {})
  }, [])

  const selectedPlan = plans.find(p => p.id === planId)
  const amount = selectedPlan
    ? (selectedPlan.isCustom ? customVisits * 180 : selectedPlan.price)
    : 0
  const visitsForPlan = selectedPlan
    ? (selectedPlan.isCustom ? customVisits : selectedPlan.visitsTotal)
    : 0

  const setAcc = (key, value) => setAccount(prev => ({ ...prev, [key]: value }))

  function addFamily() { setFamily(f => [...f, { name: '', relation: 'Spouse', age: '' }]) }
  function setFam(i, key, value) {
    setFamily(f => f.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)))
  }
  function removeFam(i) { setFamily(f => f.filter((_, idx) => idx !== i)) }

  function validateStep() {
    setErr('')
    if (step === 0) {
      if (!account.name.trim()) return 'Enter your name'
      if (!/^\d{10}$/.test(account.mobile)) return 'Enter a valid 10-digit mobile number'
      if (!account.homeFacilityCode) return 'Pick your home facility'
    }
    if (step === 1) {
      for (const m of family) {
        if (!m.name.trim()) return 'Every family member needs a name (or remove the row)'
      }
    }
    if (step === 2) {
      if (!planId) return 'Choose a plan'
      if (selectedPlan?.isCustom && (customVisits < 5 || customVisits > 300)) {
        return 'Custom plan needs 5 to 300 visits'
      }
    }
    return ''
  }

  function next() {
    const v = validateStep()
    if (v) { setErr(v); return }
    setStep(s => s + 1)
  }

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const r = await api.post('/signup', {
        account,
        family: family.filter(m => m.name.trim()),
        planId,
        customPlan: selectedPlan?.isCustom ? { visits: customVisits } : null,
        payment
      })
      signIn(r.token, r.user)
      await refresh()
      setDone(r)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="aqua-shell hx-bg-mesh">
        <main className="aqua-page narrow" style={{ paddingTop: 64 }}>
          <div className="hx-card hx-anim-scale-in">
            <div className="hx-card-body center stack" style={{ textAlign: 'center' }}>
              <span className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 16 }}>
                <I.Check size={28} />
              </span>
              <h2 style={{ margin: 0 }}>Welcome to AquaLife!</h2>
              <p className="p-sm muted" style={{ margin: 0 }}>
                Your membership is active and your QR card is ready.
              </p>
            </div>
            <div className="hx-card-body" style={{ borderTop: '1px solid var(--hx-line-soft)' }}>
              <div className="aqua-kv"><span>Payment reference</span><b>{done.payment.ref}</b></div>
              <div className="aqua-kv"><span>Amount paid</span><b>{inr(done.payment.amount)}</b></div>
              <div className="aqua-kv"><span>Method</span><b>{done.payment.method.toUpperCase()}</b></div>
              <div className="aqua-kv">
                <span>Status</span>
                <span className="hx-badge hx-badge-success hx-badge-dot">Paid</span>
              </div>
            </div>
            <div className="hx-card-footer">
              <button className="hx-btn hx-btn-primary" style={{ width: '100%' }}
                onClick={() => navigate('/member')}>
                Go to my dashboard <I.ArrowRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="aqua-shell hx-bg-mesh">
      <main className="aqua-page narrow" style={{ paddingTop: 40 }}>
        <div className="center" style={{ textAlign: 'center', marginBottom: 20 }}>
          <Link to="/" className="brand-mark" style={{ width: 44, height: 44, margin: '0 auto', borderRadius: 13 }}>
            <I.Waves size={23} />
          </Link>
          <h2 style={{ margin: '12px 0 2px' }}>Join AquaLife</h2>
          <p className="p-sm muted" style={{ margin: 0 }}>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>

        <div className="hx-stepper" style={{ marginBottom: 18 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: 'contents' }}>
              {i > 0 && <div className="hx-step-connector" />}
              <div className="hx-step"
                data-state={i < step ? 'done' : i === step ? 'active' : 'pending'}>
                <div className="hx-step-icon">
                  {i < step ? <I.Check size={13} /> : i + 1}
                </div>
                <div className="hx-step-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {err && (
          <div className="hx-callout hx-callout-danger" style={{ marginBottom: 14 }}>
            <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
          </div>
        )}

        {/* Step 0 — account */}
        {step === 0 && (
          <div className="hx-card"><div className="hx-card-body stack">
            <div>
              <label className="hx-label">Full name</label>
              <input className="hx-input" value={account.name}
                onChange={e => setAcc('name', e.target.value)} placeholder="e.g. Aarav Sharma" />
            </div>
            <div>
              <label className="hx-label">Mobile number</label>
              <div className="hx-input-group">
                <I.Phone size={15} />
                <input className="hx-input" value={account.mobile} inputMode="numeric" maxLength={10}
                  onChange={e => setAcc('mobile', e.target.value.replace(/\D/g, ''))}
                  placeholder="Your login & primary contact" />
              </div>
            </div>
            <div>
              <label className="hx-label">Email <span className="muted">(optional)</span></label>
              <input className="hx-input" value={account.email}
                onChange={e => setAcc('email', e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="hx-label">Home facility</label>
              <select className="hx-select" value={account.homeFacilityCode}
                onChange={e => setAcc('homeFacilityCode', e.target.value)}>
                <option value="">Select a facility…</option>
                {facilities.map(f => (
                  <option key={f.code} value={f.code}>{f.name} — {f.city}</option>
                ))}
              </select>
            </div>
          </div></div>
        )}

        {/* Step 1 — family */}
        {step === 1 && (
          <div className="hx-card"><div className="hx-card-body stack">
            <p className="p-sm muted" style={{ margin: 0 }}>
              Add family members who can use the membership. You can change this later.
            </p>
            {family.map((m, i) => (
              <div key={i} className="hx-card" style={{ background: 'var(--hx-bg-1)' }}>
                <div className="hx-card-body stack-sm">
                  <div>
                    <label className="hx-label">Name</label>
                    <input className="hx-input" value={m.name}
                      onChange={e => setFam(i, 'name', e.target.value)} />
                  </div>
                  <div className="aqua-grid-2">
                    <div>
                      <label className="hx-label">Relation</label>
                      <select className="hx-select" value={m.relation}
                        onChange={e => setFam(i, 'relation', e.target.value)}>
                        {RELATIONS.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="hx-label">Age</label>
                      <input className="hx-input" value={m.age} inputMode="numeric" maxLength={3}
                        onChange={e => setFam(i, 'age', e.target.value.replace(/\D/g, ''))} />
                    </div>
                  </div>
                  <button className="hx-btn hx-btn-ghost hx-btn-sm" onClick={() => removeFam(i)}>
                    <I.Trash size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
            <button className="hx-btn hx-btn-secondary" onClick={addFamily}>
              <I.Plus size={15} /> Add family member
            </button>
            {family.length === 0 && (
              <p className="p-sm subtle center" style={{ textAlign: 'center', margin: 0 }}>
                No family members? You can continue as a solo member.
              </p>
            )}
          </div></div>
        )}

        {/* Step 2 — plan */}
        {step === 2 && (
          <div className="stack">
            {plans.map(p => {
              const on = planId === p.id
              return (
                <div key={p.id} className="hx-card" role="button" onClick={() => setPlanId(p.id)}
                  style={{
                    cursor: 'pointer',
                    borderColor: on ? 'var(--hx-primary)' : undefined,
                    boxShadow: on ? '0 0 0 3px var(--hx-primary-soft)' : undefined
                  }}>
                  <div className="hx-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                          {p.name}{' '}
                          {p.name === 'Wave' && <span className="hx-badge hx-badge-brand">Popular</span>}
                        </div>
                        <div className="p-sm subtle">{p.tagline}</div>
                      </div>
                      {!p.isCustom && (
                        <div style={{ textAlign: 'right' }}>
                          <div className="big-stat" style={{ fontSize: '1.5rem' }}>{inr(p.price)}</div>
                        </div>
                      )}
                    </div>
                    {!p.isCustom && (
                      <div className="aqua-row wrap" style={{ marginTop: 10, gap: 6 }}>
                        <span className="hx-badge">{p.visitsTotal} visits</span>
                        <span className="hx-badge">up to {p.maxFamily} family</span>
                        <span className="hx-badge">valid {p.validityDays} days</span>
                      </div>
                    )}
                    {p.isCustom && on && (
                      <div style={{ marginTop: 12 }}>
                        <label className="hx-label">Number of visits (5–300) · {inr(180)} per visit</label>
                        <input className="hx-input" value={customVisits} inputMode="numeric"
                          onClick={e => e.stopPropagation()}
                          onChange={e => setCustomVisits(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))} />
                        <div className="big-stat" style={{ fontSize: '1.5rem', marginTop: 8 }}>
                          {inr(customVisits * 180)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Step 3 — payment (mocked) */}
        {step === 3 && (
          <div className="hx-card"><div className="hx-card-body stack">
            <div className="hx-callout hx-callout-info">
              <I.Info size={16} className="hx-callout-icon" />
              <div>Payment is mocked for this proof of concept — no real charge is made.</div>
            </div>
            <div>
              <div className="aqua-kv"><span>Plan</span><b>{selectedPlan?.name}</b></div>
              <div className="aqua-kv"><span>Visits included</span><b>{visitsForPlan}</b></div>
              <div className="aqua-kv"><span>Amount payable</span><b>{inr(amount)}</b></div>
            </div>
            <div>
              <label className="hx-label">Payment method</label>
              <select className="hx-select" value={payment.method}
                onChange={e => setPayment({ method: e.target.value })}>
                <option value="upi">UPI</option>
                <option value="card">Credit / Debit card</option>
                <option value="netbanking">Net banking</option>
              </select>
            </div>
            <button className="hx-btn hx-btn-primary hx-btn-lg" style={{ width: '100%' }}
              data-loading={busy ? 'true' : undefined} disabled={busy} onClick={submit}>
              <I.CreditCard size={16} /> Pay {inr(amount)} &amp; activate
            </button>
          </div></div>
        )}

        <div className="aqua-row" style={{ marginTop: 14 }}>
          {step > 0 && (
            <button className="hx-btn hx-btn-secondary" onClick={() => { setErr(''); setStep(s => s - 1) }}>
              <I.ArrowLeft size={15} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 && (
            <button className="hx-btn hx-btn-primary" onClick={next}>
              Continue <I.ArrowRight size={15} />
            </button>
          )}
        </div>

        <p className="center p-sm muted" style={{ textAlign: 'center', marginTop: 16 }}>
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
