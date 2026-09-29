import React, { useEffect, useState } from 'react'
import api from '../api'
import { useApp } from '../context'
import { fmtScore, fmtDateTime, riskTone, ALERT_STATUS_META } from '../lib/format'
import { COLORS } from '../lib/theme'

const STATUSES = [
  { id: '', label: 'ALL' },
  { id: 'open', label: 'OPEN' },
  { id: 'investigating', label: 'INVESTIGATING' },
  { id: 'confirmed_fraud', label: 'CONFIRMED' },
  { id: 'false_positive', label: 'FP' },
  { id: 'dismissed', label: 'DISMISSED' },
]

const TRANSITIONS = [
  { id: 'open', label: 'Open' },
  { id: 'investigating', label: 'Investigate' },
  { id: 'confirmed_fraud', label: 'Confirm Fraud' },
  { id: 'false_positive', label: 'False Positive' },
  { id: 'dismissed', label: 'Dismiss' },
]

export default function Alerts() {
  const { toast } = useApp()
  const [data, setData] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const params = new URLSearchParams({ limit: '300' })
      if (statusFilter) params.set('status', statusFilter)
      if (riskFilter) params.set('risk', riskFilter)
      setData(await api.alerts(`?${params}`))
    } catch {
      setData(null)
    }
  }

  useEffect(() => { load() }, [statusFilter, riskFilter])

  const updateStatus = async (alertId, status) => {
    setBusy(true)
    try {
      const updated = await api.updateAlert(alertId, { status, notes: notes || undefined })
      toast(`Alert ${updated.alert_id} → ${status.replace('_', ' ')}`, 'success')
      setSelected(updated)
      setNotes('')
      load()
    } catch (e) {
      toast(`Update failed: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No alerts yet. Generate a dataset and train a model to populate the queue.</p>
      </div>
    )
  }

  const alerts = data.alerts || []

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Open" value={data.open} color={COLORS.high} />
        <SummaryCard label="Investigating" value={data.investigating} color={COLORS.info} />
        <SummaryCard label="Confirmed Fraud" value={data.confirmed} color={COLORS.fraud} />
        <SummaryCard label="False Positives" value={data.false_positive} color={COLORS.low} sub={`${(data.false_positive_rate * 100).toFixed(1)}% rate`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Queue */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Alert Queue</span>
            <span className="num text-2xs text-zinc-500">{data.total} shown</span>
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  statusFilter === s.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="max-h-[600px] overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Alert</th><th>Transaction</th><th>Risk</th><th>Score</th><th>Status</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const rt = riskTone(a.risk_level)
                  const st = ALERT_STATUS_META[a.status] || ALERT_STATUS_META.open
                  return (
                    <tr key={a.alert_id} onClick={() => setSelected(a)} className="cursor-pointer">
                      <td className="num text-zinc-400">{a.alert_id}</td>
                      <td className="num text-zinc-500">{a.transaction_id}</td>
                      <td><span className={`badge ${rt.badge}`}>{a.risk_level}</span></td>
                      <td className="num" style={{ color: rt.bar }}>{fmtScore(a.hybrid_score)}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td className="num text-2xs text-zinc-500">{fmtDateTime(a.created_at)}</td>
                    </tr>
                  )
                })}
                {!alerts.length && <tr><td colSpan={6} className="text-center py-8 text-zinc-600">No alerts match filter</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail + workflow */}
        <div className="panel h-fit">
          <div className="panel-header"><span className="panel-title">Alert Workflow</span></div>
          {selected ? (
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="num text-zinc-200">{selected.alert_id}</span>
                <span className={`badge ${riskTone(selected.risk_level).badge}`}>{selected.risk_level}</span>
              </div>
              <div className="text-xs text-zinc-500 num">
                {selected.transaction_id} · score <span className="text-zinc-300">{fmtScore(selected.hybrid_score)}</span>
              </div>

              <div>
                <div className="kicker mb-2">Factors</div>
                <div className="space-y-1.5">
                  {(selected.contributing_factors || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="w-1 h-1 rounded-full bg-signal-fraud shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="kicker mb-2">Set Status</div>
                <div className="flex flex-wrap gap-2">
                  {TRANSITIONS.map((t) => (
                    <button
                      key={t.id}
                      disabled={busy}
                      onClick={() => updateStatus(selected.alert_id, t.id)}
                      className={`h-9 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                        selected.status === t.id
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="kicker mb-2">Analyst Notes</div>
                <textarea
                  className="input w-full h-20 resize-none py-2"
                  placeholder="Add investigation notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-zinc-600 text-center">Select an alert to manage</div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="kicker">{label}</span>
        {sub && <span className="text-2xs text-zinc-600 num">{sub}</span>}
      </div>
      <div className="num mt-3 text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  )
}
