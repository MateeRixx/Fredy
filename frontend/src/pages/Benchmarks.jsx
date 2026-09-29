import React, { useState } from 'react'
import api from '../api'
import { useApp } from '../context'
import { fmtScore, fmtPct } from '../lib/format'
import { COLORS } from '../lib/theme'

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
    <div className="mx-auto max-w-[1320px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config */}
        <div className="panel h-fit">
          <div className="panel-header"><span className="panel-title">Benchmark Configuration</span></div>
          <div className="space-y-5 p-5 sm:p-6">
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              Temporal split (first 80% train / last 20% test) on ULB-format synthetic data. Honest metrics — PR AUC is
              the primary signal for imbalanced fraud data.
            </p>
            <label className="flex flex-col gap-1">
              <span className="label">Synthetic Rows</span>
              <input type="number" className="input" min={5000} max={250000} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
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
              <div className="animate-pulse text-center text-2xs text-slate-500 dark:text-slate-400">
                Training RF + IF on {rows.toLocaleString()} rows — may take a minute
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Benchmark Results</span>
            {results && <span className="num text-2xs text-slate-500 dark:text-slate-400">{rowsResult?.toLocaleString()} rows · temporal 80/20</span>}
          </div>
          {results ? (
            <div className="space-y-5 p-5 sm:p-6">
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
                        <td className="font-medium text-slate-800 dark:text-slate-100">{r.model}</td>
                        <td className="num text-right text-signal-cyan">{r.roc != null ? fmtScore(r.roc, 4) : '—'}</td>
                        <td className="num text-right text-amber-400">{r.pr != null ? fmtScore(r.pr, 4) : '—'}</td>
                        <td className="num text-right text-slate-700 dark:text-slate-200">{r.f1 != null ? fmtScore(r.f1, 4) : 'N/A'}</td>
                        <td className="text-2xs text-slate-500 dark:text-slate-400">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <BenchGauge label="RF ROC AUC" value={rf?.roc_auc ?? 0} />
                <BenchGauge label="Hybrid ROC AUC" value={hybrid?.roc_auc ?? 0} />
                <BenchGauge label="Hybrid PR AUC" value={hybrid?.pr_auc ?? 0} />
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-2xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                Isolation Forest is unsupervised — F1 is not applicable. Hybrid best F1 threshold selected via
                precision-recall optimization.
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">Run a benchmark to compare model performance.</div>
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
  const color = value >= 0.85 ? COLORS.low : value >= 0.6 ? COLORS.amber : COLORS.fraud
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke={COLORS.surface} strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${arc} ${circ - arc}`} transform="rotate(-90 38 38)" />
        <text x="38" y="42" textAnchor="middle" dominantBaseline="central" fill={COLORS.text} fontSize="14" fontFamily="IBM Plex Mono" fontWeight="600">
          {value ? (value * 100).toFixed(1) : '0.0'}
        </text>
      </svg>
      <span className="kicker text-center">{label}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60" onClick={() => onChange(!checked)}>
      <span
        className={`w-8 h-[18px] rounded-full shrink-0 relative transition-colors border ${
          checked ? 'bg-red-500 border-red-500' : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <span className={`absolute top-[1px] h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[15px]' : 'left-[1px]'}`} />
      </span>
      <span className="text-[0.8125rem] font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  )
}
