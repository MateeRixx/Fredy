import React from 'react'
import { Moon, Sun } from 'lucide-react'

import { useApp } from '../context.jsx'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useApp()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      className={`grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:shadow-none dark:hover:text-white ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}
