# 🏊 AquaLife — Pool Membership & Check-in (Proof of Concept)

A single React + Vite app, backed by one Express + SQLite server, covering
**both** sides of a swimming-pool membership SaaS:

- **Members** subscribe to a plan, add family, and carry a QR membership card.
- **Attendants** run the check-in desk.
- **Admins** see operations across facilities.

One codebase, one server — no separate apps to maintain.

## The problem this POC solves

At peak hours an attendant manually typing "how many people" mis-counts.
AquaLife moves data entry to the member:

1. The member taps exactly **who** is visiting (themselves + named family).
2. The app computes the headcount and sends a **named, auditable roster**.
3. The attendant just matches faces to the list and taps **Confirm** — once.

Headcount is never typed under pressure. Every visit records *which* family
members attended, and the plan balance is checked before any visit is deducted.

## Run it

```bash
npm install      # installs deps (better-sqlite3 builds a native module)
npm run dev      # starts API (:4000) + Vite UI (:8173)
```

Open **http://localhost:8173**. SQLite auto-seeds demo data on first boot
(`server/data.sqlite`). Reset anytime with `npm run reseed`.

For a production-style single-process run: `npm run build && npm start`
(Express then serves the built UI from `/dist`).

## Demo accounts (OTP is always `1234`)

| Role      | Mobile       | Notes                                   |
|-----------|--------------|-----------------------------------------|
| Member    | 9810000001   | Aarav Sharma — Wave plan, family of 3   |
| Member    | 9810000002   | Kabir Nair — Splash plan, low balance   |
| Attendant | 9000000002   | Ravi — AquaLife Andheri, Mumbai         |
| Attendant | 9000000003   | Meena — AquaLife Koramangala, Bengaluru |
| Admin     | 9000000001   | Ops Admin — all facilities              |

The landing page has one-tap login buttons for all of them.

## Suggested demo flow

1. **Sign up** a brand-new member (`/signup`) — account → family → plan
   (₹5000 / ₹10000 / custom) → mocked payment. You land on the dashboard
   with a live QR card.
2. As that member, open **Check in** → scan a facility desk QR (use the
   *Demo shortcut* if there's no camera) → tick who's visiting → send.
3. Open the **Attendant** view in another window — the check-in appears in
   the live queue with the headcount already counted. Tap **Confirm**.
4. The member's screen updates to "checked in"; visits are deducted.
5. The attendant can also **Scan member card** for an attendant-driven
   check-in (still a tick-list, never typed).
6. The **Admin** view shows per-facility traffic and low-balance members.

## Tech & layout

- `server/` — Express API + `better-sqlite3`. `db.js` holds schema + seed.
- `src/` — React UI (React Router). `pages/` per role, shared `components/`.
- `src/helix/` — Helix Design System (dark-first, OKLCH tokens). The brand is
  re-tuned to an aquatic cyan in `src/app.css`; a light/dark toggle is built in.
- Camera QR scanning via `html5-qrcode`; QR rendering via `qrcode.react`.
- Both QR uses are supported: a **member card QR** (attendant scans it) and a
  **facility desk QR** (member scans it to self check-in).

### Mocked for the POC

OTP delivery, payments, and SaaS tenant management are stubbed. The data model
already carries `tenants` and roles so multi-tenant SaaS is a natural next step.
