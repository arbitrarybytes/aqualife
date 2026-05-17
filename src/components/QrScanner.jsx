import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { I } from '../helix/icons.jsx'

let seq = 0

/**
 * Camera QR scanner with graceful fallbacks for demos:
 *  - live camera scan (html5-qrcode)
 *  - one-tap "demo shortcut" buttons (no camera needed)
 *  - manual paste of a QR value
 * Calls onScan(text) exactly once per resolved code.
 */
export default function QrScanner({ onScan, demoChoices = [] }) {
  const [status, setStatus] = useState('starting')
  const [manual, setManual] = useState('')
  const elemId = useRef('qr-reader-' + (++seq))
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const handledRef = useRef(false)

  function fire(text) {
    if (handledRef.current) return
    handledRef.current = true
    onScanRef.current(text)
  }

  useEffect(() => {
    let scanner
    let cancelled = false

    ;(async () => {
      try {
        scanner = new Html5Qrcode(elemId.current, { verbose: false })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => fire(text),
          () => {}
        )
        if (!cancelled) setStatus('running')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      if (scanner) {
        try {
          if (scanner.getState && scanner.getState() === 2 /* SCANNING */) {
            scanner.stop().then(() => scanner.clear()).catch(() => {})
          } else {
            scanner.clear()
          }
        } catch { /* ignore teardown errors */ }
      }
    }
  }, [])

  return (
    <div className="stack">
      <div className="scanner-box"><div id={elemId.current} /></div>

      {status === 'starting' && (
        <div className="hx-help" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="hx-spinner" /> Starting camera…
        </div>
      )}
      {status === 'error' && (
        <div className="hx-callout hx-callout-info">
          <I.Info size={16} className="hx-callout-icon" />
          <div>Camera unavailable here — use a demo shortcut or paste a code below.</div>
        </div>
      )}

      {demoChoices.length > 0 && (
        <div>
          <div className="hx-eyebrow" style={{ marginBottom: 8 }}>Demo shortcut — no camera</div>
          <div className="aqua-row wrap">
            {demoChoices.map(c => (
              <button key={c.value} className="hx-btn hx-btn-secondary hx-btn-sm"
                onClick={() => fire(c.value)}>
                <I.QrCode size={14} /> {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) fire(manual.trim()) }}>
        <label className="hx-label">Or paste a QR value</label>
        <div className="aqua-row">
          <input className="hx-input" value={manual} onChange={e => setManual(e.target.value)}
            placeholder="AQUA-MEMBER:… or AQUA-FACILITY:…" />
          <button className="hx-btn hx-btn-secondary" type="submit">Use</button>
        </div>
      </form>
    </div>
  )
}
