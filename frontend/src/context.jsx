import React, { createContext, useContext, useCallback, useState } from 'react'
import api from './api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [health, setHealth] = useState(null)
  const [notify, setNotify] = useState(null)

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await api.health())
    } catch {
      setHealth(null)
    }
  }, [])

  const toast = useCallback((message, type = 'info') => {
    setNotify({ message, type, id: Date.now() })
  }, [])

  return (
    <AppContext.Provider value={{ health, refreshHealth, toast, notify, setNotify }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

export function Toast() {
  const { notify, setNotify } = useApp()
  if (!notify) return null
  const tone = {
    success: 'border-signal-low/40 text-signal-low',
    error: 'border-signal-fraud/40 text-signal-fraud',
    info: 'border-line text-zinc-300',
  }[notify.type] || 'border-line text-zinc-300'
  setTimeout(() => setNotify(null), 3500)
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className={`panel border ${tone} bg-ink-800 px-4 py-3 text-sm shadow-panel`}>
        {notify.message}
      </div>
    </div>
  )
}