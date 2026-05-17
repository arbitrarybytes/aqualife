import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import QrScanner from '../components/QrScanner.jsx'
import { api } from '../api.js'
import { Avatar, BalanceBar, fmtTime } from '../ui.jsx'
import { I } from '../helix/icons.jsx'

export default function AttendantHome() {
  const [facilities, setFacilities] = useState([])
  const [facilityId, setFacilityId] = useState(null)
  const [queue, setQueue] = useState([])
  const [todayCount, setTodayCount] = useState(0)
  const [flash, setFlash] = useState(null)
  const [err, setErr] = useState('')

  const [manual, setManual] = useState(null) // null | 'scan' | 'roster'
  const [member, setMember] = useState(null)
  const [picked, setPicked] = useState({})
  const [demoMembers, setDemoMembers] = useState([])

  const seenIds = useRef(new Set())

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/me')
        const facs = me.facilities || []
        setFacilities(facs)
        if (facs[0]) setFacilityId(facs[0].id)
        setDemoMembers(await api.get('/demo/members'))
      } catch (e) {
        setErr(e.message)
      }
    })()
  }, [])

  async function loadQueue() {
    if (!facilityId) return
    try {
      const rows = await api.get(`/checkins?facilityId=${facilityId}`)
      setQueue(rows)
      const today = new Date().toISOString().slice(0, 10)
      setTodayCount(rows.filter(r =>
        r.status === 'confirmed' && r.createdAt.slice(0, 10) === today).length)
    } catch { /* keep last */ }
  }

  useEffect(() => {
    if (!facilityId || manual) return
    loadQueue()
    const t = setInterval(loadQueue, 3000)
    return () => clearInterval(t)
  }, [facilityId, manual])

  const pending = queue.filter(q => q.status === 'pending')
  const recent = queue.filter(q => q.status !== 'pending').slice(0, 8)
  const peopleWaiting = pending.reduce((s, c) => s + c.headcount, 0)

  function showFlash(msg, kind = 'success') {
    setFlash({ msg, kind })
    setTimeout(() => setFlash(null), 3800)
  }

  async function confirm(id) {
    try {
      const r = await api.post(`/checkins/${id}/confirm`)
      showFlash(`Confirmed — ${r.checkin.headcount} checked in (${r.checkin.memberName})`)
      loadQueue()
    } catch (e) { showFlash(e.message, 'danger') }
  }
  async function reject(id) {
    try {
      await api.post(`/checkins/${id}/reject`, { note: 'Rejected at desk' })
      showFlash('Check-in rejected', 'warning')
      loadQueue()
    } catch (e) { showFlash(e.message, 'danger') }
  }

  function onScanMember(text) {
    const token = text.startsWith('AQUA-MEMBER:') ? text.slice('AQUA-MEMBER:'.length) : text
    api.get('/members/by-qr/' + encodeURIComponent(token))
      .then(m => { setMember(m); setPicked({ self: true }); setManual('roster'); setErr('') })
      .catch(e => setErr(e.message))
  }

  async function submitManual() {
    try {
      const attendees = []
      if (picked.self) attendees.push({ kind: 'self' })
      for (const f of member.family) {
        if (picked['f' + f.id]) attendees.push({ kind: 'family', familyMemberId: f.id })
      }
      const r = await api.post('/checkins/attendant', {
        memberQrToken: member.user.qrToken, facilityId, attendees
      })
      showFlash(`Confirmed — ${r.checkin.headcount} checked in (${r.checkin.memberName})`)
      setManual(null); setMember(null); setPicked({})
      loadQueue()
    } catch (e) { setErr(e.message) }
  }

  const facility = facilities.find(f => f.id === facilityId)

  /* ---- Manual: scan ---- */
  if (manual === 'scan') {
    return (
      <Layout>
        <div className="aqua-page narrow">
          <div className="hx-eyebrow">Attendant-led check-in</div>
          <h1 style={{ margin: '6px 0 16px', fontSize: '1.5rem' }}>Scan member card</h1>
          {err && (
            <div className="hx-callout hx-callout-danger" style={{ marginBottom: 14 }}>
              <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
            </div>
          )}
          <div className="hx-card"><div className="hx-card-body">
            <QrScanner onScan={onScanMember}
              demoChoices={demoMembers.map(m => ({
                label: m.name, value: 'AQUA-MEMBER:' + m.qrToken
              }))} />
          </div></div>
          <button className="hx-btn hx-btn-ghost" onClick={() => { setManual(null); setErr('') }}>
            <I.ArrowLeft size={15} /> Back to desk
          </button>
        </div>
      </Layout>
    )
  }

  /* ---- Manual: roster ---- */
  if (manual === 'roster' && member) {
    const sub = member.subscription
    const count = Object.values(picked).filter(Boolean).length
    const over = sub && count > sub.visitsRemaining
    return (
      <Layout>
        <div className="aqua-page narrow">
          <div className="hx-eyebrow">Attendant-led check-in</div>
          <h1 style={{ margin: '6px 0 16px', fontSize: '1.5rem' }}>Confirm visit</h1>
          {err && (
            <div className="hx-callout hx-callout-danger" style={{ marginBottom: 14 }}>
              <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
            </div>
          )}

          <div className="hx-card"><div className="hx-card-body stack">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={member.user.name} size={48} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{member.user.name}</div>
                <div className="p-sm subtle">{member.user.mobile}</div>
              </div>
            </div>
            {sub ? (
              <div>
                <div className="aqua-kv"><span>Plan</span><b>{sub.planName}</b></div>
                <div className="aqua-kv">
                  <span>Visits left</span>
                  <b className="tnum">{sub.visitsRemaining} of {sub.visitsTotal}</b>
                </div>
                <BalanceBar used={sub.visitsUsed} total={sub.visitsTotal} />
              </div>
            ) : (
              <div className="hx-callout hx-callout-danger" style={{ margin: 0 }}>
                <I.Warn size={15} className="hx-callout-icon" /><div>No active membership.</div>
              </div>
            )}
          </div></div>

          <div className="hx-card"><div className="hx-card-body stack">
            <div style={{ fontWeight: 600 }}>Tick who is present</div>
            <div className="stack-sm">
              <RosterRow name={member.user.name} sub="Primary member"
                on={!!picked.self} onToggle={() => setPicked(p => ({ ...p, self: !p.self }))} />
              {member.family.map(f => (
                <RosterRow key={f.id} name={f.name} sub={f.relation}
                  on={!!picked['f' + f.id]}
                  onToggle={() => setPicked(p => ({ ...p, ['f' + f.id]: !p['f' + f.id] }))} />
              ))}
            </div>
            <div className="aqua-divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="muted">Headcount</span>
              <span className="headcount lg">{count}</span>
            </div>
            {over && (
              <div className="hx-callout hx-callout-danger" style={{ margin: 0 }}>
                <I.Warn size={15} className="hx-callout-icon" />
                <div>Only {sub.visitsRemaining} visit(s) left — cannot check in {count}.</div>
              </div>
            )}
          </div></div>

          <button className="hx-btn hx-btn-primary hx-btn-lg" style={{ width: '100%' }}
            disabled={count === 0 || over || !sub} onClick={submitManual}>
            <I.Check size={16} /> Confirm {count} {count === 1 ? 'visitor' : 'visitors'}
          </button>
          <button className="hx-btn hx-btn-ghost" style={{ width: '100%', marginTop: 8 }}
            onClick={() => { setManual(null); setMember(null); setErr('') }}>
            Cancel
          </button>
        </div>
      </Layout>
    )
  }

  /* ---- Main desk ---- */
  return (
    <Layout>
      <div className="aqua-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="hx-eyebrow">Check-in desk</div>
            <h1 style={{ margin: '6px 0 0', fontSize: '1.7rem' }}>
              {facility ? facility.name : 'Loading…'}
            </h1>
            {facility && <p className="p-sm subtle" style={{ margin: '2px 0 0' }}>{facility.city}</p>}
          </div>
          <div className="aqua-row wrap">
            {facilities.length > 1 && (
              <select className="hx-select" style={{ width: 'auto' }} value={facilityId || ''}
                onChange={e => setFacilityId(Number(e.target.value))}>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
            <button className="hx-btn hx-btn-primary" onClick={() => { setManual('scan'); setErr('') }}>
              <I.Scan size={16} /> Scan member card
            </button>
            {facility && (
              <Link className="hx-btn hx-btn-secondary" to={`/desk/${facility.code}`} target="_blank">
                <I.External size={15} /> Desk QR display
              </Link>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="aqua-grid-3" style={{ marginTop: 18 }}>
          <div className="hx-card"><div className="hx-card-body hx-stat">
            <div className="hx-stat-label">Waiting now</div>
            <div className="hx-stat-value">{pending.length}</div>
          </div></div>
          <div className="hx-card"><div className="hx-card-body hx-stat">
            <div className="hx-stat-label">People waiting</div>
            <div className="hx-stat-value">{peopleWaiting}</div>
          </div></div>
          <div className="hx-card"><div className="hx-card-body hx-stat">
            <div className="hx-stat-label">Confirmed today</div>
            <div className="hx-stat-value">{todayCount}</div>
          </div></div>
        </div>

        {err && (
          <div className="hx-callout hx-callout-danger" style={{ marginTop: 16 }}>
            <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
          </div>
        )}
        {flash && (
          <div className={'hx-callout hx-callout-' + flash.kind} style={{ marginTop: 16 }}>
            <I.Info size={16} className="hx-callout-icon" /><div>{flash.msg}</div>
          </div>
        )}

        <div className="hx-callout hx-callout-info" style={{ marginTop: 16 }}>
          <I.Sparkles size={16} className="hx-callout-icon" />
          <div>
            Members send their own check-ins below — headcount is already counted.
            Match faces to the named list and tap <strong>Confirm</strong>.
          </div>
        </div>

        {/* Live queue */}
        <div className="hx-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>
          Waiting to be confirmed{pending.length > 0 ? ` · ${pending.length}` : ''}
        </div>
        {pending.length === 0 && (
          <div className="hx-card"><div className="hx-card-body">
            <div className="hx-empty">
              <div className="hx-empty-icon"><I.Check size={22} /></div>
              <div className="hx-empty-title">Queue is clear</div>
              <div className="hx-empty-desc">Member check-ins will appear here in real time.</div>
            </div>
          </div></div>
        )}
        <div className="stack">
          {pending.map(c => {
            const fresh = !seenIds.current.has(c.id)
            seenIds.current.add(c.id)
            return (
              <div key={c.id} className={'hx-card' + (fresh ? ' hx-anim-slide-up' : '')}
                style={{ borderLeft: '3px solid var(--hx-warning)' }}>
                <div className="hx-card-body stack">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={c.memberName} size={46} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{c.memberName}</div>
                      <div className="p-sm subtle">
                        {c.memberMobile} · sent {fmtTime(c.createdAt)}
                      </div>
                    </div>
                    <span className="headcount lg">{c.headcount}</span>
                  </div>
                  <div className="stack-sm">
                    {c.attendees.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.88rem' }}>
                        <I.Users size={14} /> {a}
                      </div>
                    ))}
                  </div>
                  <div className="aqua-row">
                    <button className="hx-btn hx-btn-primary" style={{ flex: 1 }}
                      onClick={() => confirm(c.id)}>
                      <I.Check size={16} /> Confirm {c.headcount}
                    </button>
                    <button className="hx-btn hx-btn-secondary" onClick={() => reject(c.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent */}
        <div className="hx-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>Recent at this facility</div>
        <div className="hx-card"><div className="hx-card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {recent.length === 0 && <p className="p-sm subtle" style={{ padding: '8px 0' }}>Nothing yet today.</p>}
          {recent.map(c => (
            <div className="aqua-listrow" key={c.id}>
              <Avatar name={c.memberName} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{c.memberName}</div>
                <div className="p-sm subtle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fmtTime(c.createdAt)} · {c.attendees.join(', ')}
                </div>
              </div>
              <span className="headcount">{c.headcount}</span>
              <span className={'hx-badge ' + (c.status === 'confirmed' ? 'hx-badge-success' : 'hx-badge-danger') + ' hx-badge-dot'}>
                {c.status}
              </span>
            </div>
          ))}
        </div></div>
      </div>
    </Layout>
  )
}

function RosterRow({ name, sub, on, onToggle }) {
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
