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
    case 'critical': return { text: 'text-signal-fraud', badge: 'bg-signal-fraud/15 text-signal-fraud border border-signal-fraud/40', bar: '#ff3b47', dot: '#ff3b47' }
    case 'high': return { text: 'text-signal-high', badge: 'bg-signal-high/15 text-signal-high border border-signal-high/40', bar: '#ff7a2a', dot: '#ff7a2a' }
    case 'medium': return { text: 'text-signal-medium', badge: 'bg-signal-medium/15 text-signal-medium border border-signal-medium/40', bar: '#f5b83d', dot: '#f5b83d' }
    case 'low': return { text: 'text-signal-low', badge: 'bg-signal-low/15 text-signal-low border border-signal-low/40', bar: '#26d9a0', dot: '#26d9a0' }
    default: return { text: 'text-zinc-400', badge: 'bg-zinc-600/20 text-zinc-400 border border-zinc-600', bar: '#71717a', dot: '#71717a' }
  }
}

export const ALERT_STATUS_META = {
  open: { label: 'OPEN', cls: 'bg-signal-high/15 text-signal-high border-signal-high/40' },
  investigating: { label: 'INVESTIGATING', cls: 'bg-signal-info/15 text-signal-info border-signal-info/40' },
  confirmed_fraud: { label: 'CONFIRMED', cls: 'bg-signal-fraud/15 text-signal-fraud border-signal-fraud/40' },
  false_positive: { label: 'FALSE POSITIVE', cls: 'bg-signal-low/15 text-signal-low border-signal-low/40' },
  dismissed: { label: 'DISMISSED', cls: 'bg-zinc-600/20 text-zinc-500 border-zinc-600/40' },
}