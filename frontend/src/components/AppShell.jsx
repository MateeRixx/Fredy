import React, { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  ChartNoAxesColumnIncreasing,
  CircleGauge,
  LayoutDashboard,
  ListTree,
  LogOut,
  TriangleAlert,
} from 'lucide-react'

import api from '../api'
import { useApp } from '../context.jsx'
import Alerts from '../pages/Alerts'
import Benchmarks from '../pages/Benchmarks'
import Dashboard from '../pages/Dashboard'
import Model from '../pages/Model'
import Transactions from '../pages/Transactions'
import BrandMark from './BrandMark'
import ThemeToggle from './ThemeToggle'

const NAV_ITEMS = [
  { to: '/', label: 'Command', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListTree },
  { to: '/alerts', label: 'Alerts', icon: TriangleAlert },
  { to: '/model', label: 'Model', icon: CircleGauge },
  { to: '/benchmarks', label: 'Benchmarks', icon: ChartNoAxesColumnIncreasing },
]

export default function AppShell({ session, onLogout }) {
  const [health, setHealth] = useState(null)
  const location = useLocation()
  const { refreshHealth } = useApp()

  useEffect(() => {
    let active = true
    const tick = async () => {
      try {
        const result = await api.health()
        if (active) {
          setHealth(result)
          refreshHealth()
        }
      } catch {
        if (active) setHealth(null)
      }
    }
    tick()
    const interval = setInterval(tick, 4000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [refreshHealth])

  return (
    <div className="flex h-screen gap-3 overflow-hidden bg-slate-100 p-3 dark:bg-slate-950">
      <aside className="hidden w-[248px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none md:flex">
        <BrandLockup />
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => <DesktopNavItem key={item.to} {...item} />)}
        </nav>
        <SessionPanel health={health} session={session} onLogout={onLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 shrink-0 items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 md:hidden">
              <BrandMark size={16} />
            </div>
            <h1 className="truncate text-base font-bold capitalize tracking-tight text-slate-900 dark:text-white">
              {location.pathname === '/' ? 'Command Overview' : location.pathname.replace('/', '')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:shadow-none dark:hover:text-white md:hidden"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex">
              <span className="uppercase tracking-widest">UTC</span>
              <span className="num text-slate-700 dark:text-slate-200">{new Date().toISOString().slice(11, 19)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${health ? 'bg-signal-low pulse-dot' : 'bg-signal-fraud'}`} />
              <span className="text-2xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{health ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 pt-3 md:pb-0">
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

      <nav className="fixed inset-x-3 bottom-3 z-40 grid h-16 grid-cols-5 rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-300/30 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none md:hidden" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => <MobileNavItem key={item.to} {...item} />)}
      </nav>
    </div>
  )
}

function BrandLockup() {
  return (
    <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
        <BrandMark size={15} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">FRAUD COMMAND</div>
        <div className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Transaction Intel</div>
      </div>
    </div>
  )
}

function DesktopNavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all ${
        isActive
          ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
      {label}
    </NavLink>
  )
}

function MobileNavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[0.6rem] font-semibold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
    >
      <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}

function SessionPanel({ health, session, onLogout }) {
  const modelTrained = health?.model_trained
  return (
    <div className="border-t border-slate-100 px-5 py-5 dark:border-slate-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="kicker">Model</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full pulse-dot ${modelTrained ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <span className={`font-semibold ${modelTrained ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {modelTrained ? 'Trained' : 'Not trained'}
        </span>
      </div>
      {health?.dataset_loaded && (
        <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{health.source || health.dataset_type}</div>
      )}
      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={session.email}>{session.email}</div>
        <button className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus:text-sky-600 dark:text-slate-400 dark:hover:text-white" onClick={onLogout}>
          <LogOut size={13} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  )
}
