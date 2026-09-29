import React, { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import api from './api'
import { Toast } from './context.jsx'
import AppShell from './components/AppShell'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState({ loading: true, authenticated: false, email: null })

  useEffect(() => {
    let active = true
    api.session()
      .then((result) => { if (active) setSession({ loading: false, ...result }) })
      .catch(() => { if (active) setSession({ loading: false, authenticated: false, email: null }) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession({ loading: false, authenticated: false, email: null })
    }
    window.addEventListener('fraud-command:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('fraud-command:unauthorized', handleUnauthorized)
  }, [])

  const logout = async () => {
    try { await api.logout() } finally {
      setSession({ loading: false, authenticated: false, email: null })
    }
  }

  if (session.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950">
        <div className="flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.18em] text-zinc-600">
          <LoaderCircle className="animate-spin text-amber-400" size={15} aria-hidden="true" />
          Establishing secure session
        </div>
      </div>
    )
  }

  if (!session.authenticated) {
    return <Login onAuthenticated={(result) => setSession({ loading: false, ...result })} />
  }

  return (
    <>
      <AppShell session={session} onLogout={logout} />
      <Toast />
    </>
  )
}
