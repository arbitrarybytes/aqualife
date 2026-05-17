import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const me = await api.get('/me')
      setUser(me.user)
      setLoading(false)
      return me.user
    } catch {
      setToken(null)
      setUser(null)
      setLoading(false)
      return null
    }
  }

  useEffect(() => { refresh() }, [])

  function signIn(token, u) {
    setToken(token)
    setUser(u)
  }

  function signOut() {
    api.post('/auth/logout').catch(() => {})
    setToken(null)
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}

export function homePath(role) {
  if (role === 'admin') return '/admin'
  if (role === 'attendant') return '/attendant'
  return '/member'
}
