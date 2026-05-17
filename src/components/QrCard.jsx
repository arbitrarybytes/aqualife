import { QRCodeSVG } from 'qrcode.react'
import { I } from '../helix/icons.jsx'

// Membership QR payload — what an attendant's scanner reads off the card.
export function memberQrValue(qrToken) {
  return 'AQUA-MEMBER:' + qrToken
}

export default function QrCard({ user, subscription }) {
  return (
    <div className="member-card">
      <div className="mc-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="mc-label">AquaLife Member</div>
          <div className="mc-name">{user.name}</div>
          <div className="mc-label" style={{ marginTop: 2, letterSpacing: '0.04em' }}>
            {subscription?.planName || 'No active plan'}
          </div>
        </div>
        <I.Waves size={26} />
      </div>

      <div className="mc-row" style={{ alignItems: 'center', marginTop: 18 }}>
        <div className="qr-frame">
          <QRCodeSVG value={memberQrValue(user.qrToken)} size={104} />
        </div>
        <div>
          <div className="mc-label">Membership ID</div>
          <div className="mc-id">{user.qrToken}</div>
          <div className="mc-label" style={{ marginTop: 10 }}>Mobile</div>
          <div className="mc-id">{user.mobile}</div>
        </div>
      </div>

      <div className="mc-label" style={{ marginTop: 16, letterSpacing: '0.03em', textTransform: 'none' }}>
        Show this QR at any AquaLife desk — or self check-in from the app.
      </div>
    </div>
  )
}
