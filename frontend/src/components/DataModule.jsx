import React, { useState, useRef } from 'react'
import api from '../api'
import { useApp } from '../context'
import { fmtNum, fmtPct } from '../lib/format'

export function DataModule({ onLoaded }) {
  const { toast, refreshHealth } = useApp()
  const [tab, setTab] = useState('synthetic')
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState(10000)
  const [fraudRate, setFraudRate] = useState(2)
  const [customers, setCustomers] = useState(500)
  const [seed, setSeed] = useState(42)
  const [ulbRows, setUlbRows] = useState(50000)
  const [ulbFraud, setUlbFraud] = useState(0.172)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef(null)

  const runGenerate = async (kind) => {
    setBusy(true)
    try {
      if (kind === 'synthetic') {
        await api.generate({ rows, fraud_rate: fraudRate / 100, n_customers: customers, seed })
        toast(`Generated ${fmtNum(rows)} synthetic transactions`, 'success')
      } else {
        await api.generateUlb({ rows: ulbRows, fraud_rate: ulbFraud / 100, seed })
        toast(`Generated ${fmtNum(ulbRows)} ULB-format transactions`, 'success')
      }
      refreshHealth()
      onLoaded?.()
    } catch (e) {
      toast(`Failed: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file) => {
    setBusy(true)
    try {
      const res = await api.upload(file)
      toast(`Loaded ${fmtNum(res.total)} transactions from ${file.name}`, 'success')
      refreshHealth()
      onLoaded?.()
    } catch (e) {
      toast(`Upload failed: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const tabs = [
    { id: 'synthetic', label: 'Synthetic' },
    { id: 'ulb', label: 'ULB Format' },
    { id: 'upload', label: 'Upload CSV' },
  ]

  return (
    <div className="panel max-w-3xl">
      <div className="panel-header">
        <span className="panel-title">Data Source</span>
        <span className="text-2xs text-zinc-600">Initialize pipeline</span>
      </div>
      <div className="p-5">
        <div className="flex gap-1 mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 h-8 text-[0.75rem] font-medium rounded-md transition-colors border ${
                tab === t.id
                  ? 'bg-ink-700/60 text-amber-400 border-amber-400/40'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'synthetic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Rows">
                <input type="number" className="input w-full" value={rows} min={100} onChange={(e) => setRows(Number(e.target.value))} />
              </Field>
              <Field label="Fraud Rate %">
                <input type="number" className="input w-full" value={fraudRate} min={0} max={100} step={0.1} onChange={(e) => setFraudRate(Number(e.target.value))} />
              </Field>
              <Field label="Customers">
                <input type="number" className="input w-full" value={customers} min={10} onChange={(e) => setCustomers(Number(e.target.value))} />
              </Field>
              <Field label="Seed">
                <input type="number" className="input w-full" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
              </Field>
            </div>
            <button className="btn-solid" disabled={busy} onClick={() => runGenerate('synthetic')}>
              {busy ? 'Generating…' : 'Generate Synthetic Dataset'}
            </button>
          </div>
        )}

        {tab === 'ulb' && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
              ULB Credit Card schema: <span className="num text-zinc-300">Time, V1–V28, Amount, Class</span>. Generates
              a matching synthetic dataset with realistic PCA features and class imbalance.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rows">
                <input type="number" className="input w-full" value={ulbRows} min={100} onChange={(e) => setUlbRows(Number(e.target.value))} />
              </Field>
              <Field label="Fraud Rate %">
                <input type="number" className="input w-full" value={ulbFraud} min={0} max={100} step={0.001} onChange={(e) => setUlbFraud(Number(e.target.value))} />
              </Field>
            </div>
            <button className="btn-solid" disabled={busy} onClick={() => runGenerate('ulb')}>
              {busy ? 'Generating…' : 'Generate ULB Dataset'}
            </button>
          </div>
        )}

        {tab === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
              drag ? 'border-signal-cyan/60 bg-signal-cyan/5' : 'border-line'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
              <path d="M12 15V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v4h16v-4" strokeLinecap="round" />
            </svg>
            <div className="text-sm text-zinc-400">Drop a transaction CSV, or <span className="text-signal-cyan">browse</span></div>
            <div className="text-2xs text-zinc-600">Accepts ULB (Time, V1–V28, Amount, Class) or synthetic (customer_id, amount, timestamp, is_fraud)</div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) upload(f) }} />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}