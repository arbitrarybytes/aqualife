import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import QrCard from '../components/QrCard.jsx'
import { api } from '../api.js'
import { Avatar, BalanceBar, StatusPill, fmtDate, fmtTime } from '../ui.jsx'
import { I } from '../helix/icons.jsx'

const autoGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }

export default function MemberHome() {
  const [me, setMe] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/me').then(setMe).catch(e => setErr(e.message))
  }, [])

  if (err) return <Layout><div className="aqua-page"><div className="hx-callout hx-callout-danger"><I.Warn size={16} className="hx-callout-icon" /><div>{err}</div></div></div></Layout>
  if (!me) return <Layout><div className="loader-screen"><span className="hx-spinner hx-spinner-lg" /><span>Loading your membership…</span></div></Layout>

  const { user, subscription: sub, family = [], history = [], pendingCheckin } = me
  const confirmedVisits = history.filter(h => h.status === 'confirmed').length

  return (
    <Layout>
      <div className="aqua-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="hx-eyebrow">Member workspace</div>
            <h1 style={{ margin: '6px 0 0', fontSize: '1.7rem' }}>
              Hi, {user.name.split(' ')[0]}
            </h1>
          </div>
          <Link className="hx-btn hx-btn-primary" to="/member/checkin">
            <I.Scan size={16} /> Check in to a pool
          </Link>
        </div>

        {pendingCheckin && (
          <div className="hx-callout hx-callout-warning" style={{ marginTop: 16 }}>
            <I.Clock size={16} className="hx-callout-icon" />
            <div>
              <strong>Check-in waiting at {pendingCheckin.facilityName}.</strong>{' '}
              {pendingCheckin.headcount} {pendingCheckin.headcount === 1 ? 'person' : 'people'} —
              the desk attendant will confirm shortly.{' '}
              <Link to="/member/checkin">View status →</Link>
            </div>
          </div>
        )}

        {/* QR card + balance */}
        <div style={{ ...autoGrid, marginTop: 18 }}>
          <QrCard user={user} subscription={sub} />

          {sub ? (
            <div className="hx-card">
              <div className="hx-card-header">
                <div className="hx-card-header-text">
                  <div className="hx-card-title">{sub.planName}</div>
                  <div className="hx-card-subtitle">Valid until {fmtDate(sub.endDate)}</div>
                </div>
                <StatusPill status={sub.status} />
              </div>
              <div className="hx-card-body stack">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <span className="big-stat">{sub.visitsRemaining}</span>
                  <span className="muted" style={{ paddingBottom: 4 }}>
                    of {sub.visitsTotal} visits remaining
                  </span>
                </div>
                <BalanceBar used={sub.visitsUsed} total={sub.visitsTotal} />
                <div>
                  <div className="aqua-kv"><span>Visits used</span><b className="tnum">{sub.visitsUsed}</b></div>
                  <div className="aqua-kv"><span>Family allowance</span><b>up to {sub.maxFamily} members</b></div>
                </div>
                {sub.visitsRemaining <= 5 && sub.visitsRemaining > 0 && (
                  <div className="hx-callout hx-callout-warning" style={{ margin: 0 }}>
                    <I.Warn size={15} className="hx-callout-icon" />
                    <div>Running low — only {sub.visitsRemaining} visit(s) left.</div>
                  </div>
                )}
                {sub.visitsRemaining === 0 && (
                  <div className="hx-callout hx-callout-danger" style={{ margin: 0 }}>
                    <I.Warn size={15} className="hx-callout-icon" />
                    <div>No visits left — please renew your plan.</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hx-card"><div className="hx-card-body">
              <div className="hx-empty">
                <div className="hx-empty-icon"><I.Info size={22} /></div>
                <div className="hx-empty-title">No active membership</div>
              </div>
            </div></div>
          )}
        </div>

        {/* Family */}
        <div className="hx-eyebrow" style={{ marginTop: 26, marginBottom: 10 }}>
          Family on this membership
        </div>
        <div className="hx-card"><div className="hx-card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="aqua-listrow">
            <Avatar name={user.name} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{user.name}</div>
              <div className="p-sm subtle">Primary member · {user.mobile}</div>
            </div>
            <span className="hx-badge hx-badge-brand">You</span>
          </div>
          {family.map(f => (
            <div className="aqua-listrow" key={f.id}>
              <Avatar name={f.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{f.name}</div>
                <div className="p-sm subtle">{f.relation}{f.age ? ` · ${f.age} yrs` : ''}</div>
              </div>
            </div>
          ))}
          {family.length === 0 && (
            <p className="p-sm subtle" style={{ padding: '8px 0' }}>No family members added.</p>
          )}
        </div></div>

        {/* History */}
        <div className="hx-eyebrow" style={{ marginTop: 22, marginBottom: 10 }}>
          Recent visits · {confirmedVisits} confirmed
        </div>
        <div className="hx-card"><div className="hx-card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {history.length === 0 && (
            <div className="hx-empty">
              <div className="hx-empty-icon"><I.Calendar size={22} /></div>
              <div className="hx-empty-title">No visits yet</div>
              <div className="hx-empty-desc">Your check-ins will appear here.</div>
            </div>
          )}
          {history.map(h => (
            <div className="aqua-listrow" key={h.id}>
              <span className="brand-mark" style={{ borderRadius: 9, width: 36, height: 36 }}>
                <I.MapPin size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{h.facilityName}</div>
                <div className="p-sm subtle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fmtTime(h.createdAt)} · {h.attendees.join(', ')}
                </div>
              </div>
              <span className="headcount">{h.headcount}</span>
              <StatusPill status={h.status} />
            </div>
          ))}
        </div></div>

        <p className="center p-sm subtle" style={{ textAlign: 'center', marginTop: 16 }}>
          Member since {fmtDate(user.createdAt)}
        </p>
      </div>
    </Layout>
  )
}
