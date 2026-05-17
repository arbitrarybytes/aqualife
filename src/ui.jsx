// Small shared UI helpers, Helix-styled.

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '').join('')
}

export function Avatar({ name, size = 38 }) {
  return (
    <span className="hx-avatar" style={{
      width: size, height: size, fontSize: size * 0.38, flexShrink: 0
    }}>
      {initials(name)}
    </span>
  )
}

export function inr(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN')
}

export function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
  })
}

// Visit-balance meter — colour shifts to amber when low, red when empty.
export function BalanceBar({ used, total }) {
  const remaining = Math.max(0, total - used)
  const pct = total ? Math.max(3, Math.min(100, (remaining / total) * 100)) : 0
  const cls = remaining === 0 ? 'empty' : remaining <= 5 ? 'low' : ''
  return (
    <div className={'aqua-meter ' + cls}>
      <i style={{ width: pct + '%' }} />
    </div>
  )
}

export function StatusPill({ status }) {
  const map = {
    confirmed: ['hx-badge hx-badge-success hx-badge-dot', 'Confirmed'],
    pending: ['hx-badge hx-badge-warning hx-badge-dot', 'At desk'],
    rejected: ['hx-badge hx-badge-danger hx-badge-dot', 'Rejected'],
    active: ['hx-badge hx-badge-success hx-badge-dot', 'Active'],
    expired: ['hx-badge hx-badge-danger', 'Expired']
  }
  const [cls, text] = map[status] || ['hx-badge', status]
  return <span className={cls}>{text}</span>
}
