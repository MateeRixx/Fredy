import React, { useState } from 'react'
import api from '../api'
import { useApp } from '../context'
import { fmtScore, fmtPct } from '../lib/format'

export default function Benchmarks() {
  const { toast } = useApp()
  const [rows, setRows] = useState(50000)
  const [useSmote, setUseSmote] = useState(true)
  const [nEstimators, setNEstimators] = useState(200)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [rowsResult, setRowsResult] = useState(null)

  const run = async () => {
    setBusy(true)
    try {
      const res = await api.benchmark({ rows, use_smote: useSmote, n_estimators: nEstimators, force_synthetic: true })
      setResults(res.results)
      setRowsResult(rows)
      toast('Benchmark completed', 'success')
    } catch (e) {
      toast(`Benchmark failed: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const rf = results?.random_forest
  const iso = results?.isolation_forest
  const hybrid = results?.hybrid

  const benchRows = [
    { model: 'Random Forest', roc: rf?.roc_auc, pr: rf?.pr_auc, f1: rf?.f1, note: `P ${rf?.precision?.toFixed(4)} · R ${rf?.recall?.toFixed(4)}` },
    { model: 'Isolation Forest', roc: iso?.roc_auc, pr: iso?.pr_auc, f1: null, note: 'unsupervised' },
    { model: 'Hybrid (RF 70/IF 30)', roc: hybrid?.roc_auc, pr: hybrid?.pr_auc, f1: hybrid?.best_f1, note: `best thr ${hybrid?.best_threshold?.toFixed(4)}` },
  ]

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Config */}
        <div className="panel h-fit">
          <div className="panel-header"><span className="panel-title">Benchmark Configuration</span></div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Temporal split (first 80% train / last 20% test) on ULB-format synthetic data. Honest metrics — PR AUC is
              the primary signal for imbalanced fraud data.
            </p>
            <label className="flex flex-col gap-1">
              <span className="label">Synthetic Rows</span>
              <input type="number" className="input" min={100} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Trees</span>
              <input type="number" className="input" min={10} max={1000} value={nEstimators} onChange={(e) => setNEstimators(Number(e.target.value))} />
            </label>
            <Toggle label="SMOTE oversampling" checked={useSmote} onChange={setUseSmote} />
            <button className="btn-solid w-full justify-center" disabled={busy} onClick={run}>
              {busy ? 'Running…' : 'Run Benchmark'}
            </button>
            {busy && (
              <div className="text-2xs text-zinc-500 text-center animate-pulse">
                Training RF + IF on {rows.toLocaleString()} rows — may take a minute
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Benchmark Results</span>
            {results && <span className="num text-2xs text-zinc-500">{rowsResult?.toLocaleString()} rows · temporal 80/20</span>}
          </div>
          {results ? (
            <div className="p-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th className="text-right">ROC AUC</th>
                      <th className="text-right">PR AUC</th>
                      <th className="text-right">F1</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchRows.map((r) => (
                      <tr key={r.model}>
                        <td className="font-medium text-zinc-200">{r.model}</td>
                        <td className="num text-right text-signal-cyan">{r.roc != null ? fmtScore(r.roc, 4) : '—'}</td>
                        <td className="num text-right text-amber-400">{r.pr != null ? fmtScore(r.pr, 4) : '—'}</td>
                        <td className="num text-right text-zinc-100">{r.f1 != null ? fmtScore(r.f1, 4) : 'N/A'}</td>
                        <td className="text-2xs text-zinc-500">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <BenchGauge label="RF ROC AUC" value={rf?.roc_auc ?? 0} />
                <BenchGauge label="Hybrid ROC AUC" value={hybrid?.roc_auc ?? 0} />
                <BenchGauge label="Hybrid PR AUC" value={hybrid?.pr_auc ?? 0} />
              </div>
              <div className="text-2xs text-zinc-500">
                Isolation Forest is unsupervised — F1 is not applicable. Hybrid best F1 threshold selected via
                precision-recall optimization.
              </div>
            </div>
          ) : (
            <div className="p-10 text-sm text-zinc-600 text-center">Run a benchmark to compare model performance.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function BenchGauge({ label, value }) {
  const pct = Math.min(1, value)
  const r = 32
  const circ = 2 * Math.PI * r
  const arc = circ * pct
  const color = value >= 0.85 ? '#26d9a0' : value >= 0.6 ? '#f5b83d' : '#ff3b47'
  return (
    <div className="bg-ink-900 border border-line rounded p-3 flex flex-col items-center gap-1.5">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#1a2230" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${arc} ${circ - arc}`} transform="rotate(-90 38 38)" />
        <text x="38" y="42" textAnchor="middle" dominantBaseline="central" fill="#fafafa" fontSize="14" fontFamily="IBM Plex Mono" fontWeight="600">
          {value ? (value * 100).toFixed(1) : '0.0'}
        </text>
      </svg>
      <span className="kicker text-center">{label}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button className="flex items-center gap-3 w-full text-left" onClick={() => onChange(!checked)}>
      <span
        className={`w-8 h-[18px] rounded-full shrink-0 relative transition-colors border ${
          checked ? 'bg-signal-high/70 border-signal-high' : 'bg-ink-800 border-line'
        }`}
      >
        <span className={`absolute top-[1px] w-3.5 h-3.5 rounded-full bg-zinc-100 transition-all ${checked ? 'left-[15px]' : 'left-[1px]'}`} />
      </span>
      <span className="text-[0.8125rem] text-zinc-200 font-medium">{label}</span>
    </button>
  )
}