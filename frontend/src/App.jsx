import React, { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import api from './api'
import { useApp, Toast } from './context.jsx'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Alerts from './pages/Alerts'
import Model from './pages/Model'
import Benchmarks from './pages/Benchmarks'

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="14" y="14" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" /></>,
    txns: <><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
    alert: <><path d="M12 3l9 17H3l9-17z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="16.5" r="0.8" fill="currentColor" /></>,
    model: <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></>,
    bench: <><path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><rect x="5" y="12" width="4" height="8" fill="currentColor" opacity="0.8" /><rect x="11" y="8" width="4" height="12" fill="currentColor" opacity="0.8" /><rect x="17" y="4" width="4" height="16" fill="currentColor" opacity="0.8" /></>,
    upload: <><path d="M12 15V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15v4h16v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{paths[name]}</svg>
}

function Shell() {
  const [health, setHealth] = useState(null)
  const location = useLocation()
  const { health: ctxHealth, refreshHealth } = useApp()

  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const h = await api.health()
        if (active) { setHealth(h); refreshHealth() }
      } catch {
        if (active) setHealth(null)
      }
    }
    tick()
    const iv = setInterval(tick, 4000)
    return () => { active = false; clearInterval(iv) }
  }, [])

  const nav = [
    { to: '/', label: 'Command', icon: 'grid', end: true },
    { to: '/transactions', label: 'Transactions', icon: 'txns' },
    { to: '/alerts', label: 'Alerts', icon: 'alert' },
    { to: '/model', label: 'Model', icon: 'model' },
    { to: '/benchmarks', label: 'Benchmarks', icon: 'bench' },
  ]

  const modelTrained = health?.model_trained

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left rail */}
      <aside className="w-[212px] shrink-0 border-r border-line bg-ink-900 flex flex-col">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-line">
          <div className="w-7 h-7 rounded bg-ink-800 border border-line flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 32 32">
              <path d="M7 22V10h3v12H7zm6 0V10h3v12h-3zm6 0V10h3v12h-3zm6 0V10h3v12h-3z" fill="#ff3b47" />
              <path d="M7 24h18" stroke="#f5b83d" strokeWidth="2" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[0.8125rem] font-semibold text-zinc-100 tracking-tight">FRAUD COMMAND</div>
            <div className="text-[0.6rem] text-zinc-500 uppercase tracking-[0.14em]">Transaction Intel</div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 h-9 rounded-md text-[0.8125rem] font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-700/60 text-amber-400 border-l-2 border-amber-400 pl-[10px]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-ink-800'
                }`
              }
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <span className="kicker">Model</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {modelTrained ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-signal-low pulse-dot" />
                <span className="text-signal-low font-medium">Trained</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-signal-medium pulse-dot" />
                <span className="text-signal-medium font-medium">Not trained</span>
              </>
            )}
          </div>
          {health?.dataset_loaded && (
            <div className="mt-1 text-2xs text-zinc-500 truncate">{health?.source || health?.dataset_type}</div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 border-b border-line bg-ink-900/80 backdrop-blur flex items-center justify-between px-5">
          <div>
            <h1 className="text-[0.9375rem] font-semibold text-zinc-100 tracking-tight capitalize">
              {location.pathname === '/' ? 'Command Overview' : location.pathname.replace('/', '')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-2xs text-zinc-500">
              <span className="uppercase tracking-widest">UTC</span>
              <span className="num text-zinc-300">{new Date().toISOString().slice(11, 19)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${health ? 'bg-signal-low pulse-dot' : 'bg-signal-fraud'}`} />
              <span className="text-2xs uppercase tracking-widest text-zinc-500">{health ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/model" element={<Model />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Shell />
      <Toast />
    </>
  )
}