import React, { useEffect, useState } from 'react'
import api from '../api'
import { useApp } from '../context'
import { fmtScore, fmtMoney, fmtTime, riskTone } from '../lib/format'

const FIELDS = [
  { key: 'customer_id', label: 'Customer', placeholder: 'CUST-00042', def: 'CUST-00001' },
  { key: 'amount', label: 'Amount (USD)', placeholder: '1525.81', def: '1200.00', type: 'number' },
  { key: 'timestamp', label: 'Timestamp', placeholder: '2024-08-26T11:39:26', def: new Date().toISOString().slice(0, 16) },
  { key: 'merchant_category', label: 'Category', placeholder: 'electronics', def: 'electronics' },
  { key: 'transaction_type', label: 'Type', placeholder: 'purchase', def: 'purchase' },
  { key: 'channel', label: 'Channel', placeholder: 'online', def: 'online' },
  { key: 'location', label: 'Location', placeholder: 'New York', def: 'New York' },
]

export default function Transactions() {
  const { toast } = useApp()
  const [scored, setScored] = useState(null)
  const [status, setStatus] = useState(null)
  const [riskFilter, setRiskFilter] = useState('')
  const [sort, setSort] = useState('hybrid_score')
  const [order, setOrder] = useState('desc')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [scoring, setScoring] = useState(false)
  const [model, setModel] = useState(null)

  const loadScored = async () => {
    try {
      const params = new URLSearchParams({ limit: '200', sort, order: order })
      if (riskFilter) params.set('risk', riskFilter)
      const s = await api.scored(`?${params}`)
      setScored(s)
    } catch { setScored(null) }
  }

  const loadStatus = async () => {
    try {
      const st = await api.dataStatus()
      const md = await api.modelStatus()
      setStatus(st)
      setModel(md)
    } catch { /* noop */ }
  }

  useEffect(() => { loadScored() }, [riskFilter, sort, order])
  useEffect(() => { loadStatus() }, [])

  const manualScore = async () => {
    setScoring(true)
    try {
      const tx = { transaction_id: `TXN-MANUAL-${Date.now() % 100000}`, ...form }
      const res = await api.scoreTransaction(tx)
      setSelected(res)
      toast('Transaction scored', 'success')
      loadScored()
    } catch (e) {
      toast(`Scoring failed: ${e.message}`, 'error')
    } finally {
      setScoring(false)
    }
  }

  const hasModel = model?.trained
  const hasData = status?.loaded

  if (!hasData) {
    return <Empty text="Load a dataset first (Command overview) to score transactions." />
  }

  const riskTabs = [
    { id: '', label: 'ALL' },
    { id: 'critical', label: 'CRITICAL' },
    { id: 'high', label: 'HIGH' },
    { id: 'medium', label: 'MEDIUM' },
    { id: 'low', label: 'LOW' },
  ]

  const rows = scored?.rows || []

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {!hasModel && (
        <div className="panel border-signal-medium/40 px-4 py-3 text-sm text-signal-medium">
          No trained model — transactions below are the dataset's pre-computed state. Train a model on the <b>Model</b> page first for live scoring.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scored table */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Scored Transactions</span>
            <div className="flex items-center gap-2">
              <span className="num text-2xs text-zinc-500">{scored?.total ?? 0} total</span>
            </div>
          </div>
          <div className="flex gap-1 px-3 py-2 border-b border-line/60 bg-ink-900/40 overflow-x-auto">
            {riskTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setRiskFilter(t.id)}
                className={`px-3 h-7 text-[0.6875rem] font-semibold rounded uppercase tracking-wider transition-colors ${
                  riskFilter === t.id ? 'bg-ink-700 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <SortHead label="ID" k="transaction_id" sort={sort} order={order} onSort={setSort} onOrder={setOrder} />
                  <SortHead label="Customer" k="customer_id" sort={sort} order={order} onSort={setSort} onOrder={setOrder} />
                  <SortHead label="Amount" k="amount" sort={sort} order={order} onSort={setSort} onOrder={setOrder} align="right" />
                  <SortHead label="Risk" k="risk_level" sort={sort} order={order} onSort={setSort} onOrder={setOrder} />
                  <SortHead label="Hybrid Score" k="hybrid_score" sort={sort} order={order} onSort={setSort} onOrder={setOrder} align="right" />
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const t = riskTone(r.risk_level)
                  return (
                    <tr key={r.transaction_id} onClick={() => setSelected(r)} className="cursor-pointer">
                      <td className="num text-zinc-400">{r.transaction_id}</td>
                      <td className="num text-zinc-500">{r.customer_id || '—'}</td>
                      <td className="num text-right text-zinc-200">{r.amount ? fmtMoney(r.amount) : '—'}</td>
                      <td><span className={`badge ${t.badge}`}>{r.risk_level}</span></td>
                      <td className="num text-right">
                        <span style={{ color: t.bar }}>{fmtScore(r.hybrid_score)}</span>
                      </td>
                      <td className="text-2xs text-zinc-500 max-w-[180px] truncate" title={(r.contributing_factors || []).join(', ')}>
                        {(r.contributing_factors || []).slice(0, 2).join(' · ') || '—'}
                      </td>
                    </tr>
                  )
                })}
                {!rows.length && (
                  <tr><td colSpan={6} className="text-center py-8 text-zinc-600">No transactions scored yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: manual scoring + drilldown */}
        <div className="space-y-5">
          {hasModel && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Live Score</span></div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1">
                      <span className="label">{f.label}</span>
                      <input
                        className="input w-full"
                        type={f.type || 'text'}
                        placeholder={f.placeholder}
                        value={form[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <button className="btn-solid w-full justify-center" disabled={scoring} onClick={manualScore}>
                  {scoring ? 'Scoring…' : 'Score Transaction'}
                </button>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-header"><span className="panel-title">Transaction Detail</span></div>
            {selected ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="num text-zinc-200">{selected.transaction_id}</span>
                  <span className={`badge ${riskTone(selected.risk_level).badge}`}>{selected.risk_level}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <ScoreCell label="Hybrid" value={fmtScore(selected.hybrid_score)} color="#f5b83d" />
                  <ScoreCell label="RF Prob" value={fmtScore(selected.fraud_probability)} color="#4aa8ff" />
                  <ScoreCell label="IF Anomaly" value={fmtScore(selected.anomaly_score)} color="#26d9a0" />
                </div>
                <div className="space-y-1.5">
                  <div className="kicker mb-1">Contributing Factors</div>
                  {(selected.contributing_factors || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="w-1 h-1 rounded-full bg-signal-high shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-zinc-600 text-center">Select a row to inspect</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreCell({ label, value, color }) {
  return (
    <div className="bg-ink-900 border border-line rounded p-2">
      <div className="kicker">{label}</div>
      <div className="num text-[0.9375rem] font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  )
}

function SortHead({ label, k, sort, order, onSort, onOrder, align }) {
  const active = sort === k
  return (
    <th className={align === 'right' ? 'text-right' : ''}>
      <button
        className={`inline-flex items-center gap-1 uppercase tracking-[0.1em] text-[0.6875rem] font-semibold ${
          active ? 'text-amber-400' : 'text-zinc-500'
        }`}
        onClick={() => {
          if (active) onOrder(order === 'asc' ? 'desc' : 'asc')
          else { onSort(k); onOrder('desc') }
        }}
      >
        {label}
        {active && <span className="num text-2xs">{order === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  )
}

function Empty({ text }) {
  return (
    <div className="p-16 flex flex-col items-center gap-3">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M4 10h16M4 15h16" />
      </svg>
      <p className="text-zinc-500 text-sm">{text}</p>
    </div>
  )
}