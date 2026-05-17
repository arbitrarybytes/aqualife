import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import { api } from '../api.js'
import { Avatar, BalanceBar } from '../ui.jsx'
import { I } from '../helix/icons.jsx'

const compactHour = (h) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`

export default function AdminHome() {
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch(e => setErr(e.message))
    api.get('/admin/members').then(setMembers).catch(() => {})
  }, [])

  if (err) return <Layout><div className="aqua-page"><div className="hx-callout hx-callout-danger"><I.Warn size={16} className="hx-callout-icon" /><div>{err}</div></div></div></Layout>
  if (!stats) return <Layout><div className="loader-screen"><span className="hx-spinner hx-spinner-lg" /><span>Loading operations…</span></div></Layout>

  const t = stats.totals
  const KPIS = [
    { k: 'Members', v: t.members, icon: 'Users' },
    { k: 'Active plans', v: t.activeSubs, icon: 'CreditCard' },
    { k: 'Total check-ins', v: t.totalConfirmed, icon: 'Activity' },
    { k: 'People served', v: t.peopleServed, icon: 'TrendingUp' }
  ]

  return (
    <Layout>
      <div className="aqua-page">
        <div className="hx-eyebrow">Operations</div>
        <h1 style={{ margin: '6px 0 2px', fontSize: '1.7rem' }}>AquaLife Pools Pvt Ltd</h1>
        <p className="p-sm subtle" style={{ margin: 0 }}>Live overview across all facilities</p>

        {/* KPI tiles */}
        <div className="aqua-grid-4" style={{ marginTop: 18 }}>
          {KPIS.map(s => {
            const Icon = I[s.icon]
            return (
              <div className="hx-card" key={s.k}><div className="hx-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="hx-stat">
                    <div className="hx-stat-label">{s.k}</div>
                    <div className="hx-stat-value">{s.v}</div>
                  </div>
                  <span className="brand-mark" style={{ borderRadius: 9, width: 32, height: 32 }}>
                    <Icon size={15} />
                  </span>
                </div>
              </div></div>
            )
          })}
        </div>

        {/* Today — hourly guest breakdown */}
        {stats.today && (() => {
          const today = stats.today
          const max = Math.max(1, ...today.hourly.map(b => b.guests))
          return (
            <>
              <div className="hx-eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>Today</div>
              <div className="hx-card">
                <div className="hx-card-header">
                  <div className="hx-card-header-text">
                    <div className="hx-card-title">Guests by hour</div>
                    <div className="hx-card-subtitle">
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  {today.peakHour && (
                    <span className="hx-badge hx-badge-warning hx-badge-dot">
                      Peak · {today.peakHour.label}
                    </span>
                  )}
                </div>
                <div className="hx-card-body">
                  <div className="aqua-grid-3" style={{ marginBottom: 18 }}>
                    <div className="hx-stat">
                      <div className="hx-stat-label">Guests today</div>
                      <div className="hx-stat-value">{today.totalGuests}</div>
                    </div>
                    <div className="hx-stat">
                      <div className="hx-stat-label">Check-ins</div>
                      <div className="hx-stat-value">{today.totalCheckins}</div>
                    </div>
                    <div className="hx-stat">
                      <div className="hx-stat-label">Peak hour</div>
                      <div className="hx-stat-value-sm">
                        {today.peakHour ? `${today.peakHour.guests} @ ${today.peakHour.label}` : '—'}
                      </div>
                    </div>
                  </div>

                  {today.hourly.length === 0 ? (
                    <div className="hx-empty">
                      <div className="hx-empty-icon"><I.Clock size={22} /></div>
                      <div className="hx-empty-title">No check-ins yet today</div>
                      <div className="hx-empty-desc">Hourly traffic appears here as guests arrive.</div>
                    </div>
                  ) : (
                    <div className="aqua-chart">
                      {today.hourly.map(b => {
                        const isPeak = today.peakHour && b.hour === today.peakHour.hour && b.guests > 0
                        const pct = b.guests ? Math.max(8, Math.round((b.guests / max) * 100)) : 0
                        return (
                          <div className="aqua-chart-col" key={b.hour}
                            title={`${b.label} — ${b.guests} guest(s), ${b.checkins} check-in(s)`}>
                            <div className="aqua-chart-val">{b.guests || ''}</div>
                            <div className="aqua-chart-track">
                              <div className={'aqua-chart-bar' + (isPeak ? ' peak' : '')}
                                style={{ height: pct + '%' }} />
                            </div>
                            <div className={'aqua-chart-x' + (isPeak ? ' peak' : '')}>
                              {compactHour(b.hour)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {today.byFacility.some(f => f.guests > 0) && (
                    <div className="aqua-row wrap" style={{ marginTop: 16 }}>
                      {today.byFacility.map(f => (
                        <span className="hx-badge" key={f.code}>
                          {f.name} · {f.guests} guest{f.guests === 1 ? '' : 's'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        })()}

        {/* Facilities */}
        <div className="hx-eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>Facilities — today</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
          {stats.facilities.map(f => (
            <div className="hx-card" key={f.id}>
              <div className="hx-card-header">
                <div className="hx-card-header-text">
                  <div className="hx-card-title">{f.name}</div>
                  <div className="hx-card-subtitle">{f.code} · {f.city}</div>
                </div>
                {f.pending > 0
                  ? <span className="hx-badge hx-badge-warning hx-badge-dot">{f.pending} waiting</span>
                  : <span className="hx-badge hx-badge-success hx-badge-dot">clear</span>}
              </div>
              <div className="hx-card-body">
                <div className="aqua-grid-3">
                  <div className="hx-stat">
                    <div className="hx-stat-label">Visits</div>
                    <div className="hx-stat-value-sm">{f.todayVisits}</div>
                  </div>
                  <div className="hx-stat">
                    <div className="hx-stat-label">People</div>
                    <div className="hx-stat-value-sm">{f.todayPeople}</div>
                  </div>
                  <div className="hx-stat">
                    <div className="hx-stat-label">Waiting</div>
                    <div className="hx-stat-value-sm">{f.pending}</div>
                  </div>
                </div>
                <p className="p-sm subtle" style={{ margin: '12px 0 0' }}>{f.address}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Low balance */}
        <div className="hx-eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>
          Low-balance members — renewal follow-ups
        </div>
        <div className="hx-card"><div className="hx-card-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {stats.lowBalance.length === 0 && (
            <p className="p-sm subtle" style={{ padding: '8px 0' }}>All members have a healthy balance.</p>
          )}
          {stats.lowBalance.map((m, i) => (
            <div className="aqua-listrow" key={i}>
              <Avatar name={m.name} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{m.name}</div>
                <div className="p-sm subtle">{m.mobile} · {m.planName}</div>
              </div>
              <span className={'hx-badge ' + (m.visitsRemaining === 0 ? 'hx-badge-danger' : 'hx-badge-warning') + ' hx-badge-dot'}>
                {m.visitsRemaining} left
              </span>
            </div>
          ))}
        </div></div>

        {/* Members table */}
        <div className="hx-eyebrow" style={{ marginTop: 24, marginBottom: 10 }}>All members</div>
        <div className="hx-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="hx-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Plan</th>
                  <th>Family</th>
                  <th style={{ minWidth: 150 }}>Visit balance</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Avatar name={m.name} size={30} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{m.name}</div>
                          <div className="p-sm subtle">{m.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td>{m.subscription ? m.subscription.planName : <span className="hx-badge hx-badge-danger">none</span>}</td>
                    <td className="tnum">{m.familyCount}</td>
                    <td>
                      {m.subscription ? (
                        <div style={{ minWidth: 130 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                            <span className="subtle">used {m.subscription.visitsUsed}</span>
                            <b className="tnum">{m.subscription.visitsRemaining}/{m.subscription.visitsTotal}</b>
                          </div>
                          <BalanceBar used={m.subscription.visitsUsed} total={m.subscription.visitsTotal} />
                        </div>
                      ) : <span className="subtle">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="center p-sm subtle" style={{ textAlign: 'center', marginTop: 16 }}>
          SaaS roles in this demo — member · attendant · admin (all mocked)
        </p>
      </div>
    </Layout>
  )
}
