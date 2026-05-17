import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'
import { nanoid } from 'nanoid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'data.sqlite')

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS facilities (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  open_hours TEXT,
  qr_token TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  visits_total INTEGER NOT NULL,
  max_family INTEGER NOT NULL,
  validity_days INTEGER NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  tagline TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  qr_token TEXT UNIQUE,
  home_facility_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS staff_facilities (
  user_id INTEGER NOT NULL,
  facility_id INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  relation TEXT NOT NULL,
  age INTEGER
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  plan_id INTEGER,
  plan_name TEXT NOT NULL,
  visits_total INTEGER NOT NULL,
  visits_used INTEGER NOT NULL DEFAULT 0,
  max_family INTEGER NOT NULL,
  price_paid INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY,
  subscription_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  facility_id INTEGER NOT NULL,
  attendant_id INTEGER,
  headcount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS checkin_attendees (
  id INTEGER PRIMARY KEY,
  checkin_id INTEGER NOT NULL,
  family_member_id INTEGER,
  label TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
`

db.exec(SCHEMA)

const iso = (d) => d.toISOString()
const daysFromNow = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

export function seed() {
  // INTEGER PRIMARY KEY (rowid) restarts from 1 once a table is emptied,
  // so no AUTOINCREMENT / sqlite_sequence handling is needed here.
  const wipe = db.transaction(() => {
    for (const t of [
      'sessions', 'checkin_attendees', 'checkins', 'subscriptions',
      'family_members', 'staff_facilities', 'users', 'plans', 'facilities', 'tenants'
    ]) {
      db.prepare(`DELETE FROM ${t}`).run()
    }
  })
  wipe()

  const now = iso(new Date())

  const tenantId = db.prepare(
    'INSERT INTO tenants (name, created_at) VALUES (?, ?)'
  ).run('AquaLife Pools Pvt Ltd', now).lastInsertRowid

  const insFacility = db.prepare(
    `INSERT INTO facilities (tenant_id, code, name, city, address, open_hours, qr_token)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const facRajaji = insFacility.run(
    tenantId, 'AQ-RAJ', 'AquaLife Rajaji Nagar', 'Bengaluru',
    '1st Block, Rajaji Nagar, Bengaluru 560053', '6:00 AM - 10:00 PM',
    'fac_' + nanoid(10)
  ).lastInsertRowid
  const facKor = insFacility.run(
    tenantId, 'AQ-KOR', 'AquaLife Koramangala', 'Bengaluru',
    '5th Block, Koramangala, Bengaluru 560095', '5:30 AM - 10:30 PM',
    'fac_' + nanoid(10)
  ).lastInsertRowid

  const insPlan = db.prepare(
    `INSERT INTO plans (tenant_id, name, price, visits_total, max_family, validity_days, is_custom, tagline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const planSplash = insPlan.run(
    tenantId, 'Splash', 5000, 30, 3, 90, 0, 'Great for getting started'
  ).lastInsertRowid
  const planWave = insPlan.run(
    tenantId, 'Wave', 10000, 75, 5, 180, 0, 'Best value for families'
  ).lastInsertRowid
  insPlan.run(
    tenantId, 'Custom', 0, 0, 6, 365, 1, 'Tailor visits to your needs'
  )

  const insUser = db.prepare(
    `INSERT INTO users (tenant_id, mobile, name, email, role, qr_token, home_facility_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  // Staff
  const adminId = insUser.run(
    tenantId, '9000000001', 'Ops Admin', 'admin@aqualife.example', 'admin', null, null, now
  ).lastInsertRowid
  const att1 = insUser.run(
    tenantId, '9000000002', 'Ravi Kumar', 'ravi@aqualife.example', 'attendant', null, facRajaji, now
  ).lastInsertRowid
  const att2 = insUser.run(
    tenantId, '9000000003', 'Meena Joshi', 'meena@aqualife.example', 'attendant', null, facKor, now
  ).lastInsertRowid
  db.prepare('INSERT INTO staff_facilities (user_id, facility_id) VALUES (?, ?)').run(att1, facRajaji)
  db.prepare('INSERT INTO staff_facilities (user_id, facility_id) VALUES (?, ?)').run(att2, facKor)

  const insFamily = db.prepare(
    'INSERT INTO family_members (user_id, name, relation, age) VALUES (?, ?, ?, ?)'
  )
  const insSub = db.prepare(
    `INSERT INTO subscriptions
       (user_id, plan_id, plan_name, visits_total, visits_used, max_family, price_paid, status, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
  )

  // Member 1 — Aarav Sharma: Wave plan, family of 3, healthy balance
  const m1 = insUser.run(
    tenantId, '9810000001', 'Kiran Rao', 'kiran.rao@example.com', 'member', 'mem_' + nanoid(10), facRajaji, now
  ).lastInsertRowid
  insFamily.run(m1, 'Radhika Rao', 'Spouse', 34)
  insFamily.run(m1, 'Aarohi Rao', 'Daughter', 10)

  const sub1 = insSub.run(m1, planWave, 'Wave', 75, 12, 5, 10000, iso(daysFromNow(-30)), iso(daysFromNow(150)), now
  ).lastInsertRowid

  // Member 2 — Kabir Nair: Splash plan, low balance (good for limit-warning demo)
  const m2 = insUser.run(tenantId, '9810000002', 'Vaibhav S', 'vaibhav@example.com', 'member',
    'mem_' + nanoid(10), facKor, now).lastInsertRowid

  insFamily.run(m2, 'Gunnu S', 'Son', 6)

  const sub2 = insSub.run(
    m2, planSplash, 'Splash', 30, 26, 3, 5000, iso(daysFromNow(-60)), iso(daysFromNow(30)), now
  ).lastInsertRowid

  // Member 3 — Sara Iqbal: Splash plan, solo member, fresh
  const m3 = insUser.run(
    tenantId, '9810000003', 'Arjun Shetty', 'arjun@example.com', 'member', 'mem_' + nanoid(10), facRajaji, now
  ).lastInsertRowid

  const sub3 = insSub.run(
    m3, planSplash, 'Splash', 30, 2, 3, 5000, iso(daysFromNow(-10)), iso(daysFromNow(80)), now
  ).lastInsertRowid

  // A little check-in history (confirmed) for dashboards/stats
  const insCheckin = db.prepare(
    `INSERT INTO checkins
       (subscription_id, user_id, facility_id, attendant_id, headcount, status, source, created_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`
  )
  const insAttendee = db.prepare(
    'INSERT INTO checkin_attendees (checkin_id, family_member_id, label, is_primary) VALUES (?, ?, ?, ?)'
  )
  const history = [
    {
      sub: sub1, user: m1, fac: facRajaji, att: att1, count: 3, daysAgo: 2,
      people: ['Kiran Rao (Self)', 'Radhika Rao (Spouse)', 'Aarohi Rao (Daughter)']
    },
    {
      sub: sub1, user: m1, fac: facRajaji, att: att1, count: 2, daysAgo: 1,
      people: ['Kiran Rao (Self)', 'Aarohi Rao (Daughter)']
    },
    {
      sub: sub2, user: m2, fac: facKor, att: att2, count: 2, daysAgo: 1,
      people: ['Vaibhav S (Self)', 'Gunnu S (Son)']
    },
    {
      sub: sub3, user: m3, fac: facRajaji, att: att1, count: 1, daysAgo: 3,
      people: ['Arjun Shetty (Self)']
    }
  ]
  for (const h of history) {
    const at = iso(daysFromNow(-h.daysAgo))
    const cid = insCheckin.run(h.sub, h.user, h.fac, h.att, h.count, 'attendant', at, at).lastInsertRowid
    h.people.forEach((label, i) => insAttendee.run(cid, null, label, i === 0 ? 1 : 0))
  }

  // Today's check-ins — a morning + evening rush pattern so the Admin
  // dashboard's hourly breakdown has realistic data on first load.
  const todayAt = (h, m = 0) => {
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return iso(d)
  }
  const Kiran = ['Kiran Rao (Self)', 'Radhika Rao (Spouse)', 'Aarohi Rao (Daughter)']
  const Vaibhav = ['Vaibhav S (Self)', 'Gunnu S (Son)']
  const todayLog = [
    { sub: sub3, user: m3, fac: facRajaji, att: att1, hr: 6, min: 20, people: ['Arjun Shetty (Self)'] },
    { sub: sub1, user: m1, fac: facRajaji, att: att1, hr: 7, min: 15, people: [Kiran[0], Kiran[2]] },
    { sub: sub2, user: m2, fac: facKor, att: att2, hr: 7, min: 50, people: Vaibhav },
    { sub: sub1, user: m1, fac: facRajaji, att: att1, hr: 8, min: 30, people: Kiran },
    { sub: sub3, user: m3, fac: facRajaji, att: att1, hr: 9, min: 10, people: ['Arjun Shetty (Self)'] },
    { sub: sub2, user: m2, fac: facKor, att: att2, hr: 17, min: 40, people: [Vaibhav[0]] },
    { sub: sub1, user: m1, fac: facRajaji, att: att1, hr: 18, min: 20, people: Kiran },
    { sub: sub3, user: m3, fac: facRajaji, att: att1, hr: 18, min: 55, people: ['Arjun Shetty (Self)'] },
    { sub: sub2, user: m2, fac: facKor, att: att2, hr: 19, min: 15, people: Vaibhav },
    { sub: sub1, user: m1, fac: facRajaji, att: att1, hr: 19, min: 45, people: [Kiran[0], Kiran[1]] },
    { sub: sub3, user: m3, fac: facRajaji, att: att1, hr: 20, min: 10, people: ['Arjun Shetty (Self)'] }
  ]

  for (const t of todayLog) {
    const at = todayAt(t.hr, t.min)
    const cid = insCheckin.run(
      t.sub, t.user, t.fac, t.att, t.people.length, 'attendant', at, at
    ).lastInsertRowid
    t.people.forEach((label, i) => insAttendee.run(cid, null, label, i === 0 ? 1 : 0))
  }

  console.log('[db] seeded demo data')
}

// Auto-seed on first boot (empty database).
const tenantCount = db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n
if (tenantCount === 0) seed()

export default db
