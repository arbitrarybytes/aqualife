import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import QrScanner from '../components/QrScanner.jsx'
import { api } from '../api.js'
import { Avatar } from '../ui.jsx'
import { I } from '../helix/icons.jsx'

export default function MemberCheckin() {
  const [params] = useSearchParams()
  const [me, setMe] = useState(null)
  const [stage, setStage] = useState('loading') // loading|facility|scan|attendees|pending|resolved
  const [facilities, setFacilities] = useState([])
  const [facility, setFacility] = useState(null)
  const [selected, setSelected] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [watchId, setWatchId] = useState(null)
  const [resolved, setResolved] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/me')
        setMe(data)
        setFacilities(await api.get('/facilities'))
        if (data.pendingCheckin) {
          setWatchId(data.pendingCheckin.id)
          setStage('pending')
        } else {
          const code = params.get('facility')
          if (code) {
            try {
              const f = await api.get('/facilities/resolve/' + encodeURIComponent(code))
              setFacility(f)
              setSelected({ self: true })
              setStage('attendees')
              return
            } catch { /* fall through */ }
          }
          setStage('facility')
        }
      } catch (e) {
        setErr(e.message)
      }
    })()
  }, [])

  useEffect(() => {
    if (stage !== 'pending' || !watchId) return
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.get('/me')
        setMe(data)
        if (!data.pendingCheckin || data.pendingCheckin.id !== watchId) {
          const hit = (data.history || []).find(h => h.id === watchId)
          setResolved(hit || { status: 'confirmed' })
          setStage('resolved')
        }
      } catch { /* keep polling */ }
    }, 3500)
    return () => clearInterval(pollRef.current)
  }, [stage, watchId])

  function pickFacilityFromScan(text) {
    const key = text.startsWith('AQUA-FACILITY:') ? text.slice('AQUA-FACILITY:'.length) : text
    api.get('/facilities/resolve/' + encodeURIComponent(key))
      .then(f => { setFacility(f); setSelected({ self: true }); setErr(''); setStage('attendees') })
      .catch(e => setErr(e.message))
  }

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const attendees = []
      if (selected.self) attendees.push({ kind: 'self' })
      for (const f of me.family) {
        if (selected['f' + f.id]) attendees.push({ kind: 'family', familyMemberId: f.id })
      }
      const r = await api.post('/checkins', { facilityId: facility.id, attendees })
      setWatchId(r.checkin.id)
      setMe(prev => ({ ...prev, pendingCheckin: r.checkin }))
      setStage('pending')
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  if (stage === 'loading') {
    return <Layout><div className="loader-screen"><span className="hx-spinner hx-spinner-lg" /><span>Loading…</span></div></Layout>
  }

  const sub = me?.subscription
  const headcount = Object.values(selected).filter(Boolean).length

  return (
    <Layout>
      <div className="aqua-page narrow">
        <div className="hx-eyebrow">Self check-in</div>
        <h1 style={{ margin: '6px 0 18px', fontSize: '1.6rem' }}>Check in to a pool</h1>

        {err && (
          <div className="hx-callout hx-callout-danger" style={{ marginBottom: 14 }}>
            <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
          </div>
        )}

        {/* Stage: pick facility */}
        {stage === 'facility' && (
          <div className="stack">
            <div className="hx-card"><div className="hx-card-body stack">
              <div style={{ fontWeight: 600 }}>Scan the desk QR</div>
              <p className="p-sm muted" style={{ margin: 0 }}>
                Point your camera at the QR code shown at the AquaLife check-in desk.
              </p>
              <button className="hx-btn hx-btn-primary" onClick={() => setStage('scan')}>
                <I.Scan size={16} /> Open scanner
              </button>
            </div></div>

            <div className="hx-eyebrow">Or choose a facility</div>
            <div className="hx-card"><div className="hx-card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {facilities.map(f => (
                <div className="aqua-listrow" key={f.id}>
                  <span className="brand-mark" style={{ borderRadius: 9, width: 36, height: 36 }}>
                    <I.MapPin size={16} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{f.name}</div>
                    <div className="p-sm subtle">{f.city} · {f.openHours}</div>
                  </div>
                  <button className="hx-btn hx-btn-secondary hx-btn-sm" onClick={() => {
                    setFacility(f); setSelected({ self: true }); setStage('attendees')
                  }}>
                    Select
                  </button>
                </div>
              ))}
            </div></div>
          </div>
        )}

        {/* Stage: scanning */}
        {stage === 'scan' && (
          <div className="hx-card"><div className="hx-card-body stack">
            <div style={{ fontWeight: 600 }}>Scan desk QR</div>
            <QrScanner
              onScan={pickFacilityFromScan}
              demoChoices={facilities.map(f => ({
                label: f.name, value: 'AQUA-FACILITY:' + f.qrToken
              }))}
            />
            <button className="hx-btn hx-btn-ghost hx-btn-sm" onClick={() => setStage('facility')}>
              <I.ArrowLeft size={14} /> Back
            </button>
          </div></div>
        )}

        {/* Stage: choose attendees */}
        {stage === 'attendees' && (
          <div className="stack">
            <div className="hx-callout hx-callout-info">
              <I.MapPin size={16} className="hx-callout-icon" />
              <div>Checking in at <strong>{facility.name}</strong>, {facility.city}</div>
            </div>
            <div className="hx-card"><div className="hx-card-body stack">
              <div>
                <div style={{ fontWeight: 600 }}>Who is visiting today?</div>
                <p className="p-sm muted" style={{ margin: '4px 0 0' }}>
                  Tap each person. The desk attendant only confirms — they never re-count.
                </p>
              </div>

              <div className="stack-sm">
                <PersonRow name={me.user.name} sub="You — primary member"
                  on={!!selected.self}
                  onToggle={() => setSelected(s => ({ ...s, self: !s.self }))} />
                {me.family.map(f => (
                  <PersonRow key={f.id} name={f.name} sub={f.relation}
                    on={!!selected['f' + f.id]}
                    onToggle={() => setSelected(s => ({ ...s, ['f' + f.id]: !s['f' + f.id] }))} />
                ))}
              </div>

              <div className="aqua-divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="muted">Total checking in</span>
                <span className="headcount lg">{headcount}</span>
              </div>
              {sub && (
                <div className="aqua-kv">
                  <span>Visits left after this</span>
                  <b className="tnum" style={{ color: sub.visitsRemaining - headcount < 0 ? 'var(--hx-danger)' : undefined }}>
                    {sub.visitsRemaining - headcount}
                  </b>
                </div>
              )}
            </div></div>
            <button className="hx-btn hx-btn-primary hx-btn-lg" style={{ width: '100%' }}
              data-loading={busy ? 'true' : undefined} disabled={busy || headcount === 0}
              onClick={submit}>
              Send check-in for {headcount} <I.ArrowRight size={16} />
            </button>
            <button className="hx-btn hx-btn-ghost hx-btn-sm" onClick={() => setStage('facility')}>
              <I.ArrowLeft size={14} /> Change facility
            </button>
          </div>
        )}

        {/* Stage: pending */}
        {stage === 'pending' && (
          <div className="hx-card hx-anim-fade-in"><div className="hx-card-body center stack" style={{ textAlign: 'center' }}>
            <span className="hx-spinner hx-spinner-lg" style={{ margin: '4px auto' }} />
            <h2 style={{ margin: 0 }}>Waiting at the desk</h2>
            <p className="p-sm muted" style={{ margin: 0 }}>
              Show your QR card to the attendant at <strong>{me.pendingCheckin?.facilityName}</strong>.
              They'll confirm with one tap.
            </p>
            <div className="hx-card" style={{ background: 'var(--hx-bg-1)', textAlign: 'left' }}>
              <div className="hx-card-body stack-sm">
                {(me.pendingCheckin?.attendees || []).map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <I.Users size={14} /> {a}
                  </div>
                ))}
              </div>
            </div>
            <div className="hx-help">This screen updates automatically…</div>
          </div></div>
        )}

        {/* Stage: resolved */}
        {stage === 'resolved' && (
          <div className="hx-card hx-anim-scale-in"><div className="hx-card-body center stack" style={{ textAlign: 'center' }}>
            {resolved?.status === 'rejected' ? (
              <>
                <span className="brand-mark" style={{ width: 54, height: 54, margin: '0 auto', borderRadius: 15, background: 'var(--hx-danger)' }}>
                  <I.X size={26} />
                </span>
                <h2 style={{ margin: 0 }}>Check-in not approved</h2>
                <p className="p-sm muted" style={{ margin: 0 }}>
                  {resolved?.note || 'The desk attendant rejected this check-in.'}
                </p>
              </>
            ) : (
              <>
                <span className="brand-mark" style={{ width: 54, height: 54, margin: '0 auto', borderRadius: 15 }}>
                  <I.Check size={28} />
                </span>
                <h2 style={{ margin: 0 }}>You're checked in!</h2>
                <p className="p-sm muted" style={{ margin: 0 }}>
                  Enjoy your swim. {resolved?.headcount} visit(s) deducted from your plan.
                </p>
              </>
            )}
            <Link className="hx-btn hx-btn-primary" style={{ width: '100%' }} to="/member">
              Back to dashboard
            </Link>
            <button className="hx-btn hx-btn-secondary" style={{ width: '100%' }}
              onClick={() => {
                setStage('facility'); setFacility(null); setSelected({})
                setWatchId(null); setResolved(null)
              }}>
              New check-in
            </button>
          </div></div>
        )}
      </div>
    </Layout>
  )
}

function PersonRow({ name, sub, on, onToggle }) {
  return (
    <button type="button" className={'aqua-pick' + (on ? ' on' : '')} onClick={onToggle}>
      <span className="tick">{on && <I.Check size={14} />}</span>
      <Avatar name={name} size={36} />
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 500 }}>{name}</span>
        <span className="p-sm subtle">{sub}</span>
      </span>
    </button>
  )
}
