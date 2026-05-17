import express from 'express'
import cors from 'cors'
import { nanoid } from 'nanoid'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000
const app = express()
app.use(cors())
app.use(express.json())

const nowIso = () => new Date().toISOString()
const MOCK_OTP = '1234'

// Lightweight liveness probe — used by the keep-alive workflow to ping the
// service without downloading the full frontend bundle on every request.
app.get('/healthz', (req, res) => res.json({ ok: true, ts: nowIso() }))

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function getUserByToken(token) {
  if (!token) return null
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
  if (!session) return null
  return db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) || null
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const user = getUserByToken(token)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  req.user = user
  next()
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed for your role' })
    }
    next()
  }
}

function publicUser(u) {
  return {
    id: u.id, name: u.name, mobile: u.mobile, email: u.email,
    role: u.role, qrToken: u.qr_token, homeFacilityId: u.home_facility_id,
    createdAt: u.created_at
  }
}

// Active subscription for a member, enriched with derived balance fields.
function activeSubscription(userId) {
  const sub = db.prepare(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`
  ).get(userId)
  if (!sub) return null
  const remaining = sub.visits_total - sub.visits_used
  const expired = new Date(sub.end_date) < new Date()
  return {
    id: sub.id,
    planName: sub.plan_name,
    visitsTotal: sub.visits_total,
    visitsUsed: sub.visits_used,
    visitsRemaining: remaining,
    maxFamily: sub.max_family,
    pricePaid: sub.price_paid,
    startDate: sub.start_date,
    endDate: sub.end_date,
    expired,
    status: expired ? 'expired' : sub.status
  }
}

function familyOf(userId) {
  return db.prepare('SELECT id, name, relation, age FROM family_members WHERE user_id = ?')
    .all(userId)
}

function facilityPublic(f) {
  return {
    id: f.id, code: f.code, name: f.name, city: f.city,
    address: f.address, openHours: f.open_hours, qrToken: f.qr_token
  }
}

// Build a check-in row enriched with attendee labels + facility/member names.
function checkinDetail(c) {
  const attendees = db.prepare(
    'SELECT label, is_primary FROM checkin_attendees WHERE checkin_id = ? ORDER BY is_primary DESC, id'
  ).all(c.id)
  const facility = db.prepare('SELECT name, city FROM facilities WHERE id = ?').get(c.facility_id)
  const member = db.prepare('SELECT name, mobile FROM users WHERE id = ?').get(c.user_id)
  return {
    id: c.id,
    memberName: member?.name,
    memberMobile: member?.mobile,
    facilityId: c.facility_id,
    facilityName: facility?.name,
    facilityCity: facility?.city,
    headcount: c.headcount,
    status: c.status,
    source: c.source,
    note: c.note,
    createdAt: c.created_at,
    resolvedAt: c.resolved_at,
    attendees: attendees.map(a => a.label)
  }
}

// Validate the attendee selection against a member's family roster and
// return normalised attendee rows ({ familyMemberId, label, isPrimary }).
function resolveAttendees(memberUser, attendees) {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    throw new Error('Select at least one person checking in')
  }
  const family = familyOf(memberUser.id)
  const rows = []
  let primaryCount = 0
  for (const a of attendees) {
    if (a.kind === 'self') {
      primaryCount++
      rows.push({ familyMemberId: null, label: `${memberUser.name} (Self)`, isPrimary: 1 })
    } else if (a.kind === 'family') {
      const fm = family.find(f => f.id === a.familyMemberId)
      if (!fm) throw new Error('Unknown family member in selection')
      rows.push({ familyMemberId: fm.id, label: `${fm.name} (${fm.relation})`, isPrimary: 0 })
    } else {
      throw new Error('Invalid attendee entry')
    }
  }
  if (primaryCount > 1) throw new Error('Primary member can only be counted once')
  return rows
}

/* ----------------------------------------------------------------------- */
/* Auth — mobile number is the primary identity; OTP is mocked as 1234      */
/* ----------------------------------------------------------------------- */

app.post('/api/auth/request-otp', (req, res) => {
  const { mobile } = req.body || {}
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' })
  }
  const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile)
  // Mock SMS gateway — OTP is always 1234 in this proof of concept.
  res.json({ ok: true, exists: !!user, mockOtp: MOCK_OTP })
})

app.post('/api/auth/verify-otp', (req, res) => {
  const { mobile, otp } = req.body || {}
  if (otp !== MOCK_OTP) return res.status(400).json({ error: 'Incorrect OTP (hint: 1234)' })
  const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile)
  if (!user) return res.status(404).json({ error: 'No account for this number — please sign up' })
  const token = 'sess_' + nanoid(24)
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, user.id, nowIso())
  res.json({ token, user: publicUser(user) })
})

app.post('/api/auth/logout', auth, (req, res) => {
  const header = req.headers.authorization || ''
  db.prepare('DELETE FROM sessions WHERE token = ?').run(header.slice(7))
  res.json({ ok: true })
})

/* ----------------------------------------------------------------------- */
/* Onboarding — new member sign-up with family + mocked plan & payment      */
/* ----------------------------------------------------------------------- */

app.post('/api/signup', (req, res) => {
  const { account, family, planId, customPlan, payment } = req.body || {}
  if (!account?.name || !account?.mobile) {
    return res.status(400).json({ error: 'Name and mobile number are required' })
  }
  if (!/^\d{10}$/.test(account.mobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' })
  }
  if (db.prepare('SELECT id FROM users WHERE mobile = ?').get(account.mobile)) {
    return res.status(409).json({ error: 'An account already exists for this mobile number' })
  }
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId)
  if (!plan) return res.status(400).json({ error: 'Select a membership plan' })

  // Resolve plan details — custom plans take visit count from the request.
  let visitsTotal = plan.visits_total
  let pricePaid = plan.price
  let maxFamily = plan.max_family
  let planName = plan.name
  if (plan.is_custom) {
    const v = parseInt(customPlan?.visits, 10)
    if (!v || v < 5 || v > 300) {
      return res.status(400).json({ error: 'Custom plan needs between 5 and 300 visits' })
    }
    visitsTotal = v
    pricePaid = v * 180 // mock pricing: INR 180 per visit
    planName = `Custom (${v} visits)`
  }

  const tenant = db.prepare('SELECT id FROM tenants LIMIT 1').get()
  const homeFacility = db.prepare('SELECT id FROM facilities WHERE code = ?')
    .get(account.homeFacilityCode)

  const created = db.transaction(() => {
    const userId = db.prepare(
      `INSERT INTO users (tenant_id, mobile, name, email, role, qr_token, home_facility_id, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`
    ).run(
      tenant.id, account.mobile, account.name, account.email || null,
      'mem_' + nanoid(10), homeFacility?.id || null, nowIso()
    ).lastInsertRowid

    const insFamily = db.prepare(
      'INSERT INTO family_members (user_id, name, relation, age) VALUES (?, ?, ?, ?)'
    )
    for (const f of (family || [])) {
      if (f?.name && f?.relation) {
        insFamily.run(userId, f.name, f.relation, f.age ? parseInt(f.age, 10) : null)
      }
    }

    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + plan.validity_days)
    const subId = db.prepare(
      `INSERT INTO subscriptions
        (user_id, plan_id, plan_name, visits_total, visits_used, max_family, price_paid,
         status, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, 'active', ?, ?, ?)`
    ).run(
      userId, plan.id, planName, visitsTotal, maxFamily, pricePaid,
      start.toISOString(), end.toISOString(), nowIso()
    ).lastInsertRowid

    return { userId, subId }
  })()

  // Mocked payment — no real gateway in this proof of concept.
  const paymentRef = 'PAY-' + nanoid(8).toUpperCase()
  const token = 'sess_' + nanoid(24)
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, created.userId, nowIso())

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(created.userId)
  res.json({
    token,
    user: publicUser(user),
    payment: { ref: paymentRef, amount: pricePaid, method: payment?.method || 'upi', status: 'paid' }
  })
})

/* ----------------------------------------------------------------------- */
/* Reference data                                                          */
/* ----------------------------------------------------------------------- */

app.get('/api/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM plans ORDER BY is_custom, price').all()
  res.json(plans.map(p => ({
    id: p.id, name: p.name, price: p.price, visitsTotal: p.visits_total,
    maxFamily: p.max_family, validityDays: p.validity_days,
    isCustom: !!p.is_custom, tagline: p.tagline
  })))
})

app.get('/api/facilities', (req, res) => {
  const facilities = db.prepare('SELECT * FROM facilities ORDER BY name').all()
  res.json(facilities.map(facilityPublic))
})

// Resolve a facility from its desk-QR token or short code.
app.get('/api/facilities/resolve/:key', (req, res) => {
  const key = req.params.key
  const f = db.prepare('SELECT * FROM facilities WHERE qr_token = ? OR code = ?').get(key, key)
  if (!f) return res.status(404).json({ error: 'Facility not found for this QR code' })
  res.json(facilityPublic(f))
})

// Demo convenience: lets attendant/admin screens offer one-tap "scan"
// shortcuts without a physical card. Not part of the real product surface.
app.get('/api/demo/members', auth, requireRole('attendant', 'admin'), (req, res) => {
  const rows = db.prepare(`SELECT name, qr_token FROM users WHERE role = 'member' ORDER BY name`).all()
  res.json(rows.map(r => ({ name: r.name, qrToken: r.qr_token })))
})

/* ----------------------------------------------------------------------- */
/* Current user — role-aware "me" payload                                  */
/* ----------------------------------------------------------------------- */

app.get('/api/me', auth, (req, res) => {
  const u = req.user
  const payload = { user: publicUser(u) }

  if (u.role === 'member') {
    payload.family = familyOf(u.id)
    payload.subscription = activeSubscription(u.id)
    const pending = db.prepare(
      `SELECT * FROM checkins WHERE user_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`
    ).get(u.id)
    payload.pendingCheckin = pending ? checkinDetail(pending) : null
    payload.history = db.prepare(
      `SELECT * FROM checkins WHERE user_id = ? AND status != 'pending'
       ORDER BY created_at DESC LIMIT 20`
    ).all(u.id).map(checkinDetail)
  }

  if (u.role === 'attendant') {
    const facs = db.prepare(
      `SELECT f.* FROM facilities f
       JOIN staff_facilities sf ON sf.facility_id = f.id
       WHERE sf.user_id = ?`
    ).all(u.id)
    payload.facilities = facs.map(facilityPublic)
  }

  // Admins can work the check-in desk for any facility.
  if (u.role === 'admin') {
    payload.facilities = db.prepare('SELECT * FROM facilities ORDER BY name')
      .all().map(facilityPublic)
  }

  res.json(payload)
})

/* ----------------------------------------------------------------------- */
/* Member lookup by QR — used by attendants scanning a membership card     */
/* ----------------------------------------------------------------------- */

app.get('/api/members/by-qr/:qrToken', auth, requireRole('attendant', 'admin'), (req, res) => {
  const member = db.prepare('SELECT * FROM users WHERE qr_token = ? AND role = ?')
    .get(req.params.qrToken, 'member')
  if (!member) return res.status(404).json({ error: 'No member found for this QR code' })
  const sub = activeSubscription(member.id)
  res.json({
    user: publicUser(member),
    family: familyOf(member.id),
    subscription: sub,
    recentCheckins: db.prepare(
      `SELECT * FROM checkins WHERE user_id = ? AND status = 'confirmed'
       ORDER BY created_at DESC LIMIT 5`
    ).all(member.id).map(checkinDetail)
  })
})

/* ----------------------------------------------------------------------- */
/* Check-ins                                                               */
/* ----------------------------------------------------------------------- */

// Member-initiated check-in — creates a PENDING entry the attendant confirms.
// This is the core fix for rush-hour mis-entry: the member (not the harried
// attendant) selects exactly who is visiting, so headcount is never typed
// under pressure — it is computed from a named, auditable roster.
app.post('/api/checkins', auth, requireRole('member'), (req, res) => {
  const { facilityId, attendees } = req.body || {}
  const sub = activeSubscription(req.user.id)
  if (!sub) return res.status(400).json({ error: 'No active membership found' })
  if (sub.expired) return res.status(400).json({ error: 'Your membership has expired' })

  const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(facilityId)
  if (!facility) return res.status(400).json({ error: 'Choose a facility to check in at' })

  const existing = db.prepare(
    `SELECT * FROM checkins WHERE user_id = ? AND status = 'pending'`
  ).get(req.user.id)
  if (existing) {
    return res.status(409).json({
      error: 'You already have a check-in waiting at the desk',
      pendingCheckin: checkinDetail(existing)
    })
  }

  let rows
  try {
    rows = resolveAttendees(req.user, attendees)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  if (rows.length > sub.maxFamily + 1) {
    return res.status(400).json({ error: `Your plan allows up to ${sub.maxFamily + 1} people per visit` })
  }
  if (rows.length > sub.visitsRemaining) {
    return res.status(400).json({
      error: `Only ${sub.visitsRemaining} visit(s) left on your plan — cannot check in ${rows.length}`
    })
  }

  const checkinId = db.transaction(() => {
    const id = db.prepare(
      `INSERT INTO checkins
        (subscription_id, user_id, facility_id, headcount, status, source, created_at)
       VALUES (?, ?, ?, ?, 'pending', 'member', ?)`
    ).run(sub.id, req.user.id, facility.id, rows.length, nowIso()).lastInsertRowid
    const insA = db.prepare(
      'INSERT INTO checkin_attendees (checkin_id, family_member_id, label, is_primary) VALUES (?, ?, ?, ?)'
    )
    for (const r of rows) insA.run(id, r.familyMemberId, r.label, r.isPrimary)
    return id
  })()

  res.json({ checkin: checkinDetail(db.prepare('SELECT * FROM checkins WHERE id = ?').get(checkinId)) })
})

// Attendant-side: live queue of pending + recently confirmed check-ins.
app.get('/api/checkins', auth, requireRole('attendant', 'admin'), (req, res) => {
  const { facilityId, status } = req.query
  let sql = 'SELECT * FROM checkins WHERE 1=1'
  const args = []
  if (facilityId) { sql += ' AND facility_id = ?'; args.push(facilityId) }
  if (status) { sql += ' AND status = ?'; args.push(status) }
  sql += " ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 60"
  res.json(db.prepare(sql).all(...args).map(checkinDetail))
})

// Attendant confirms a pending check-in — one tap, headcount already known.
app.post('/api/checkins/:id/confirm', auth, requireRole('attendant', 'admin'), (req, res) => {
  const c = db.prepare('SELECT * FROM checkins WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Check-in not found' })
  if (c.status !== 'pending') return res.status(400).json({ error: 'Check-in is no longer pending' })

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(c.subscription_id)
  const remaining = sub.visits_total - sub.visits_used
  if (c.headcount > remaining) {
    return res.status(400).json({
      error: `Member has only ${remaining} visit(s) left — cannot confirm ${c.headcount}`
    })
  }

  db.transaction(() => {
    db.prepare(
      `UPDATE checkins SET status = 'confirmed', attendant_id = ?, resolved_at = ? WHERE id = ?`
    ).run(req.user.id, nowIso(), c.id)
    db.prepare('UPDATE subscriptions SET visits_used = visits_used + ? WHERE id = ?')
      .run(c.headcount, sub.id)
  })()

  res.json({ checkin: checkinDetail(db.prepare('SELECT * FROM checkins WHERE id = ?').get(c.id)) })
})

app.post('/api/checkins/:id/reject', auth, requireRole('attendant', 'admin'), (req, res) => {
  const c = db.prepare('SELECT * FROM checkins WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Check-in not found' })
  if (c.status !== 'pending') return res.status(400).json({ error: 'Check-in is no longer pending' })
  db.prepare(
    `UPDATE checkins SET status = 'rejected', attendant_id = ?, resolved_at = ?, note = ? WHERE id = ?`
  ).run(req.user.id, nowIso(), req.body?.note || 'Rejected at desk', c.id)
  res.json({ ok: true })
})

// Attendant-initiated check-in (fallback when a member can't self check-in).
// Headcount still comes from a named roster of checkboxes — never typed.
app.post('/api/checkins/attendant', auth, requireRole('attendant', 'admin'), (req, res) => {
  const { memberQrToken, facilityId, attendees } = req.body || {}
  const member = db.prepare('SELECT * FROM users WHERE qr_token = ? AND role = ?')
    .get(memberQrToken, 'member')
  if (!member) return res.status(404).json({ error: 'Member not found' })
  const sub = activeSubscription(member.id)
  if (!sub) return res.status(400).json({ error: 'Member has no active membership' })
  if (sub.expired) return res.status(400).json({ error: 'Member membership has expired' })

  const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(facilityId)
  if (!facility) return res.status(400).json({ error: 'Facility not found' })

  let rows
  try {
    rows = resolveAttendees(member, attendees)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  if (rows.length > sub.visitsRemaining) {
    return res.status(400).json({
      error: `Member has only ${sub.visitsRemaining} visit(s) left — cannot check in ${rows.length}`
    })
  }

  const checkinId = db.transaction(() => {
    const id = db.prepare(
      `INSERT INTO checkins
        (subscription_id, user_id, facility_id, attendant_id, headcount, status, source, created_at, resolved_at)
       VALUES (?, ?, ?, ?, ?, 'confirmed', 'attendant', ?, ?)`
    ).run(sub.id, member.id, facility.id, req.user.id, rows.length, nowIso(), nowIso()).lastInsertRowid
    const insA = db.prepare(
      'INSERT INTO checkin_attendees (checkin_id, family_member_id, label, is_primary) VALUES (?, ?, ?, ?)'
    )
    for (const r of rows) insA.run(id, r.familyMemberId, r.label, r.isPrimary)
    db.prepare('UPDATE subscriptions SET visits_used = visits_used + ? WHERE id = ?')
      .run(rows.length, sub.id)
    return id
  })()

  res.json({ checkin: checkinDetail(db.prepare('SELECT * FROM checkins WHERE id = ?').get(checkinId)) })
})

/* ----------------------------------------------------------------------- */
/* Admin — SaaS operations overview                                        */
/* ----------------------------------------------------------------------- */

function hourLabel(h) {
  const ampm = h < 12 ? 'AM' : 'PM'
  let hh = h % 12
  if (hh === 0) hh = 12
  return `${hh} ${ampm}`
}

app.get('/api/admin/stats', auth, requireRole('admin'), (req, res) => {
  const facilities = db.prepare('SELECT * FROM facilities ORDER BY name').all()

  // All confirmed check-ins; "today" is bucketed in server-local time so the
  // hourly chart lines up with the wall clock at the facility.
  const confirmed = db.prepare(
    `SELECT created_at, headcount, facility_id FROM checkins WHERE status = 'confirmed'`
  ).all()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayRows = confirmed.filter(r => new Date(r.created_at) >= startOfToday)

  const perFacility = facilities.map(f => {
    const ft = todayRows.filter(r => r.facility_id === f.id)
    const pending = db.prepare(
      `SELECT COUNT(*) AS n FROM checkins WHERE facility_id = ? AND status = 'pending'`
    ).get(f.id).n
    return {
      ...facilityPublic(f),
      todayVisits: ft.length,
      todayPeople: ft.reduce((s, r) => s + r.headcount, 0),
      pending
    }
  })

  // Hourly breakdown of today's guests (headcount) across all facilities.
  const buckets = {}
  for (const r of todayRows) {
    const h = new Date(r.created_at).getHours()
    if (!buckets[h]) buckets[h] = { hour: h, guests: 0, checkins: 0 }
    buckets[h].guests += r.headcount
    buckets[h].checkins += 1
  }
  const activeHours = Object.keys(buckets).map(Number).sort((a, b) => a - b)
  const hourly = []
  if (activeHours.length) {
    for (let h = activeHours[0]; h <= activeHours[activeHours.length - 1]; h++) {
      const b = buckets[h] || { hour: h, guests: 0, checkins: 0 }
      hourly.push({ ...b, label: hourLabel(h) })
    }
  }
  const peakHour = hourly.reduce((m, b) => (b.guests > (m?.guests || 0) ? b : m), null)

  const members = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'member'`).get().n
  const activeSubs = db.prepare(`SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'active'`).get().n
  const totalConfirmed = db.prepare(`SELECT COUNT(*) AS n FROM checkins WHERE status = 'confirmed'`).get().n
  const peopleServed = db.prepare(
    `SELECT COALESCE(SUM(headcount),0) AS n FROM checkins WHERE status = 'confirmed'`
  ).get().n

  const lowBalance = db.prepare(
    `SELECT u.name, u.mobile, s.plan_name, s.visits_total, s.visits_used
     FROM subscriptions s JOIN users u ON u.id = s.user_id
     WHERE s.status = 'active' AND (s.visits_total - s.visits_used) <= 5
     ORDER BY (s.visits_total - s.visits_used)`
  ).all().map(r => ({
    name: r.name, mobile: r.mobile, planName: r.plan_name,
    visitsRemaining: r.visits_total - r.visits_used
  }))

  res.json({
    totals: { members, activeSubs, totalConfirmed, peopleServed },
    today: {
      totalGuests: todayRows.reduce((s, r) => s + r.headcount, 0),
      totalCheckins: todayRows.length,
      hourly,
      peakHour,
      byFacility: perFacility.map(f => ({ name: f.name, code: f.code, guests: f.todayPeople }))
    },
    facilities: perFacility,
    lowBalance
  })
})

app.get('/api/admin/members', auth, requireRole('admin'), (req, res) => {
  const rows = db.prepare(`SELECT * FROM users WHERE role = 'member' ORDER BY created_at DESC`).all()
  res.json(rows.map(u => {
    const sub = activeSubscription(u.id)
    const family = familyOf(u.id)
    return {
      ...publicUser(u),
      familyCount: family.length,
      subscription: sub
    }
  }))
})

/* ----------------------------------------------------------------------- */
/* Serve built frontend in production (single unified app)                 */
/* ----------------------------------------------------------------------- */

const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`[api] AquaLife backend running on http://localhost:${PORT}`)
})
