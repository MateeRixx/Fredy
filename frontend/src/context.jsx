import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import api from './api'

const AppContext = createContext(null)

function initialTheme() {
  const saved = window.localStorage.getItem('fraud-command-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function AppProvider({ children }) {
  const [health, setHealth] = useState(null)
  const [notify, setNotify] = useState(null)
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('fraud-command-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#05070b' : '#f1f5f9',
    )
  }, [theme])

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
    <AppContext.Provider value={{
      health,
      refreshHealth,
      toast,
      notify,
      setNotify,
      theme,
      toggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'),
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}

export function Toast() {
  const { notify, setNotify } = useApp()
  useEffect(() => {
    if (!notify) return undefined
    const timer = setTimeout(() => setNotify(null), 3500)
    return () => clearTimeout(timer)
  }, [notify, setNotify])
  if (!notify) return null
  const tone = {
    success: 'border-signal-low/40 text-signal-low',
    error: 'border-signal-fraud/40 text-signal-fraud',
    info: 'border-line text-zinc-300',
  }[notify.type] || 'border-line text-zinc-300'
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className={`panel border ${tone} bg-ink-800 px-4 py-3 text-sm shadow-panel`}>
        {notify.message}
      </div>
    </div>
  )
}
