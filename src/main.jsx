import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth.jsx'

// Helix Design System — load tokens first, then component layers.
import './helix/tokens.css'
import './helix/components.css'
import './helix/components-extra.css'
import './helix/motion.css'
import './helix/glass.css'
// App-specific styling + aquatic brand override (must come last).
import './app.css'

// StrictMode intentionally omitted: it double-mounts effects, which fights
// the camera lifecycle in the QR scanner. Fine for a proof of concept.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
