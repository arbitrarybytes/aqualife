import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../api.js'
import { I } from '../helix/icons.jsx'

// Full-screen QR for a screen/tablet at the check-in desk. Members scan
// it from the AquaLife app to self check-in.
export default function FacilityDeskQR() {
  const { code } = useParams()
  const [facility, setFacility] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/facilities/resolve/' + encodeURIComponent(code))
      .then(setFacility)
      .catch(e => setErr(e.message))
  }, [code])

  if (err) {
    return (
      <div className="aqua-shell">
        <div className="aqua-page narrow" style={{ paddingTop: 60 }}>
          <div className="hx-callout hx-callout-danger">
            <I.Warn size={16} className="hx-callout-icon" /><div>{err}</div>
          </div>
          <Link to="/">← Home</Link>
        </div>
      </div>
    )
  }
  if (!facility) {
    return <div className="loader-screen"><span className="hx-spinner hx-spinner-lg" /></div>
  }

  return (
    <div className="aqua-shell hx-bg-aurora" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24
    }}>
      <span className="brand-mark" style={{ width: 52, height: 52, borderRadius: 15 }}>
        <I.Waves size={26} />
      </span>
      <h1 style={{ margin: '18px 0 2px', fontSize: '2rem' }}>{facility.name}</h1>
      <p className="muted" style={{ margin: 0 }}>{facility.city} · {facility.openHours}</p>

      <div className="qr-frame" style={{ padding: 22, margin: '26px 0', borderRadius: 20 }}>
        <QRCodeSVG value={'AQUA-FACILITY:' + facility.qrToken} size={244} />
      </div>

      <h2 style={{ margin: '0 0 8px' }}>Scan to check in</h2>
      <p className="muted" style={{ maxWidth: 420, margin: 0 }}>
        Open the AquaLife app → <strong>Check in</strong> → scan this code. Pick who's
        visiting and the desk will confirm you in.
      </p>
      <div className="hx-badge" style={{ marginTop: 22, fontFamily: 'var(--hx-font-mono)' }}>
        Facility code · {facility.code}
      </div>
    </div>
  )
}
