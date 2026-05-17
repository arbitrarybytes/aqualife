import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, homePath } from './auth.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import MemberHome from './pages/MemberHome.jsx'
import MemberCheckin from './pages/MemberCheckin.jsx'
import AttendantHome from './pages/AttendantHome.jsx'
import AdminHome from './pages/AdminHome.jsx'
import FacilityDeskQR from './pages/FacilityDeskQR.jsx'

function FullLoader() {
  return (
    <div className="loader-screen">
      <span className="hx-spinner hx-spinner-lg" />
      <span>Loading AquaLife…</span>
    </div>
  )
}

function Protected({ role, roles, children }) {
  const { user, loading } = useAuth()
  const allowed = roles || (role ? [role] : null)
  if (loading) return <FullLoader />
  if (!user) return <Navigate to="/login" replace />
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={homePath(user.role)} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/desk/:code" element={<FacilityDeskQR />} />

      <Route path="/member" element={<Protected role="member"><MemberHome /></Protected>} />
      <Route path="/member/checkin" element={<Protected role="member"><MemberCheckin /></Protected>} />
      <Route path="/attendant" element={<Protected roles={['attendant', 'admin']}><AttendantHome /></Protected>} />
      <Route path="/admin" element={<Protected role="admin"><AdminHome /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
