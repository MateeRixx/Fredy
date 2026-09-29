import React, { useId } from 'react'
import { fmtPct } from '../lib/format'
import { COLORS } from '../lib/theme'

export function Sparkline({ data, width = 120, height = 32, stroke = COLORS.amber, fill = true }) {
  const gradientId = `spark-${useId().replaceAll(':', '')}`
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - 2 - ((v - min) / range) * (height - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={area} fill={`url(#${gradientId})`} />}
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="1.5" />
      <circle cx={width} cy={Number(pts[pts.length - 1].split(',')[1])} r="2" fill={stroke} />
    </svg>
  )
}

export function RiskDistributionBar({ distribution, height = 10 }) {
  const order = ['critical', 'high', 'medium', 'low']
  const colors = { critical: COLORS.fraud, high: COLORS.high, medium: COLORS.medium, low: COLORS.low }
  const total = order.reduce((s, k) => s + (distribution[k] || 0), 0)
  if (!total) return <div className="text-zinc-600 text-xs">No scored transactions</div>
  let offset = 0
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {order.map((k) => {
        const v = distribution[k] || 0
        const w = (v / total) * 100
        const el = w > 0.5 ? (
          <rect key={k} x={offset} y="0" width={w} height={height} fill={colors[k]} />
        ) : null
        offset += w
        return el
      })}
    </svg>
  )
}

export function RiskLegend({ distribution }) {
  const order = ['critical', 'high', 'medium', 'low']
  const colors = { critical: COLORS.fraud, high: COLORS.high, medium: COLORS.medium, low: COLORS.low }
  return (
    <div className="flex gap-4 text-2xs text-zinc-500 mt-1.5">
      {order.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px]" style={{ background: colors[k] }} />
          <span className="uppercase">{k}</span>
          <span className="num text-zinc-300">{distribution[k] || 0}</span>
        </span>
      ))}
    </div>
  )
}

export function Gauge({ value, label, max = 1, color = COLORS.amber }) {
  const pct = Math.min(1, value / max)
  const r = 40
  const circ = 2 * Math.PI * r
  const arc = circ * pct
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke={COLORS.surface} strokeWidth="7" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${arc} ${circ - arc}`}
          transform="rotate(-90 48 48)"
        />
        <text x="48" y="50" textAnchor="middle" dominantBaseline="central" fill={COLORS.text} className="num" fontSize="20" fontWeight="600">
          {(pct * 100).toFixed(1)}
        </text>
        <text x="48" y="68" textAnchor="middle" fill={COLORS.muted} fontSize="8" letterSpacing="1">/ 100</text>
      </svg>
      <span className="kicker">{label}</span>
    </div>
  )
}

export function ConfusionMatrix({ cm }) {
  if (!cm || cm.length !== 2) return null
  const labels = [['TN', 'FP'], ['FN', 'TP']]
  const maxVal = Math.max(...cm.flat())
  return (
    <div className="grid grid-cols-2 gap-px bg-line">
      {cm.map((row, i) =>
        row.map((v, j) => {
          const intensity = v / maxVal
          const isFraud = i === 1 && j === 1
          const isError = i !== j
          const bg = isError
            ? `rgb(var(--signal-fraud) / ${0.08 + intensity * 0.5})`
            : `rgb(var(--signal-low) / ${0.05 + intensity * 0.35})`
          return (
            <div key={`${i}-${j}`} className="p-3 flex flex-col gap-1" style={{ background: bg }}>
              <span className="text-2xs uppercase tracking-widest text-zinc-400">{labels[i][j]} · {i === 0 ? 'Legit' : 'Fraud'}→{j === 0 ? 'Legit' : 'Fraud'}</span>
              <span className="num text-lg text-zinc-100 font-semibold">{v.toLocaleString()}</span>
            </div>
          )
        })
      )}
    </div>
  )
}

export function BarList({ items, maxItems = 12, format = (v) => v }) {
  const data = (items || []).slice(0, maxItems)
  if (!data.length) return <div className="text-zinc-600 text-xs p-4">No data</div>
  const max = Math.max(...data.map((d) => d[1]))
  return (
    <div className="flex flex-col">
      {data.map(([name, value]) => (
        <div key={name} className="flex items-center gap-3 py-[3px]">
          <span className="w-[46%] text-[0.7rem] text-zinc-400 truncate text-right font-mono" title={name}>{name}</span>
          <div className="flex-1 h-[7px] bg-ink-800 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{ width: `${(value / max) * 100}%`, background: COLORS.amber }}
            />
          </div>
          <span className="w-14 text-[0.7rem] num text-zinc-300">{format(value)}</span>
        </div>
      ))}
    </div>
  )
}

export function ROCChart({ fpr, tpr, auc }) {
  if (!fpr || !tpr) return null
  const W = 260, H = 200, pad = 8
  const x = (v) => pad + v * (W - pad * 2)
  const y = (v) => H - pad - v * (H - pad * 2)
  const pts = fpr.map((f, i) => `${x(f).toFixed(1)},${y(tpr[i]).toFixed(1)}`).join(' ')
  const baseline = `${x(0)},${y(0)} ${x(1)},${y(1)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="rocFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.info} stopOpacity="0.3" />
          <stop offset="100%" stopColor={COLORS.info} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" stroke={COLORS.line} />
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={pad} y1={y(g)} x2={W - pad} y2={y(g)} stroke={COLORS.line} strokeDasharray="2 3" />
      ))}
      <line x1={pad} y1={y(0)} x2={W - pad} y2={y(1)} stroke={COLORS.track} strokeDasharray="4 4" />
      <polygon points={pts} fill="url(#rocFill)" />
      <polyline points={pts} fill="none" stroke={COLORS.info} strokeWidth="1.8" />
      <text x={W - pad} y={pad + 10} textAnchor="end" fill={COLORS.text} fontSize="13" fontFamily="IBM Plex Mono">
        AUC {Number(auc).toFixed(4)}
      </text>
    </svg>
  )
}

export function ScoreHistogram({ scores, labels, thresholds }) {
  if (!scores || !scores.length) return null
  const bins = 36
  const max = 1
  const min = 0
  const counts = new Array(bins).fill(0)
  const fraudCounts = new Array(bins).fill(0)
  scores.forEach((s, i) => {
    const b = Math.min(bins - 1, Math.floor(((s - min) / (max - min)) * bins))
    counts[b]++
    if (labels && labels[i] === 1) fraudCounts[b]++
  })
  const peak = Math.max(...counts, 1)
  const W = 320, H = 130
  const bw = (W / bins)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {counts.map((c, i) => {
        const h = (c / peak) * (H - 12)
        const fh = (fraudCounts[i] / peak) * (H - 12)
        const cx = i * bw
        return (
          <g key={i}>
            <rect x={cx + 0.5} y={H - h} width={bw - 1} height={h} fill={COLORS.track} />
            {fh > 0 && <rect x={cx + 0.5} y={H - fh} width={bw - 1} height={fh} fill={COLORS.fraud} />}
          </g>
        )
      })}
      {(thresholds || []).map(([name, t]) => (
        <line key={name} x1={t * W} y1={0} x2={t * W} y2={H - 2} stroke={COLORS.muted} strokeDasharray="3 3" strokeWidth="1" />
      ))}
    </svg>
  )
}
