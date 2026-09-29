import { COLORS } from './theme'

export function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function fmtPct(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${(Number(n) * 100).toFixed(digits)}%`
}

export function fmtScore(n, digits = 4) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toFixed(digits)
}

export function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('en-US', { hour12: false })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function riskTone(level) {
  switch (level) {
    case 'critical': return { text: 'text-red-700 dark:text-red-400', badge: 'border border-red-200 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400', bar: COLORS.fraud, dot: COLORS.fraud }
    case 'high': return { text: 'text-red-600 dark:text-red-400', badge: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400', bar: COLORS.high, dot: COLORS.high }
    case 'medium': return { text: 'text-amber-700 dark:text-amber-400', badge: 'border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400', bar: COLORS.medium, dot: COLORS.medium }
    case 'low': return { text: 'text-emerald-700 dark:text-emerald-400', badge: 'border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400', bar: COLORS.low, dot: COLORS.low }
    default: return { text: 'text-slate-500 dark:text-slate-400', badge: 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300', bar: COLORS.muted, dot: COLORS.muted }
  }
}

export const ALERT_STATUS_META = {
  open: { label: 'OPEN', cls: 'bg-signal-high/15 text-signal-high border-signal-high/40' },
  investigating: { label: 'INVESTIGATING', cls: 'bg-signal-info/15 text-signal-info border-signal-info/40' },
  confirmed_fraud: { label: 'CONFIRMED', cls: 'bg-signal-fraud/15 text-signal-fraud border-signal-fraud/40' },
  false_positive: { label: 'FALSE POSITIVE', cls: 'bg-signal-low/15 text-signal-low border-signal-low/40' },
  dismissed: { label: 'DISMISSED', cls: 'bg-zinc-600/20 text-zinc-500 border-zinc-600/40' },
}
