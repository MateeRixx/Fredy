import React, { useEffect, useState } from 'react'
import api from '../api'
import { useApp } from '../context'
import { ConfusionMatrix, ROCChart, BarList } from '../components/charts'
import { fmtScore, fmtPct } from '../lib/format'

export default function Model() {
  const { toast, refreshHealth } = useApp()
  const [data, setData] = useState(null)
  const [model, setModel] = useState(null)
  const [busy, setBusy] = useState(false)

  const [nEstimators, setNEstimators] = useState(200)
  const [smote, setSmote] = useState(false)
  const [temporal, setTemporal] = useState(false)
  const [testSize, setTestSize] = useState(0.2)
  const [alertThreshold, setAlertThreshold] = useState(0.5)

  const load = async () => {
    try {
      setData(await api.dataStatus())
      setModel(await api.modelStatus())
    } catch { /* noop */ }
  }

  useEffect(() => { load() }, [])

  const train = async () => {
    setBusy(true)
    try {
      const res = await api.train({
        n_estimators: nEstimators,
        use_smote: smote,
        temporal_split: temporal,
        test_size: testSize,
        cv_folds: 5,
        alert_threshold: alertThreshold,
      })
      toast(`Model trained · ROC AUC ${fmtScore(res.metrics.roc_auc, 4)} · ${res.alerts_generated} alerts`, 'success')
      await load()
      refreshHealth()
    } catch (e) {
      toast(`Training failed: ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!data?.loaded) {
    return (
      <div className="p-16 text-center">
        <p className="text-zinc-500 text-sm">Load a dataset first to train a model.</p>
      </div>
    )
  }

  const m = model?.metrics
  const importances = m ? Object.entries(m.feature_importances || {}) : []

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Training config */}
        <div className="panel h-fit">
          <div className="panel-header"><span className="panel-title">Training Configuration</span></div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Dataset</span>
              <span className="num text-zinc-200 text-xs">{data.total?.toLocaleString()} rows · {data.dataset_type}</span>
            </div>

            <label className="flex flex-col gap-1">
              <span className="label">Random Forest Trees</span>
              <input type="number" className="input" min={10} max={1000} value={nEstimators} onChange={(e) => setNEstimators(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <span className="label">Test Size</span>
              <input type="number" className="input" min={0.05} max={0.5} step={0.05} value={testSize} onChange={(e) => setTestSize(Number(e.target.value))} />
            </label>

            <label className="flex flex-col gap-1">
              <span className="label">Alert Threshold</span>
              <input type="number" className="input" min={0} max={1} step={0.05} value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value))} />
            </label>

            <div className="space-y-2">
              <Toggle label="SMOTE oversampling" hint="Synthetic minority resampling on train set only" checked={smote} onChange={setSmote} />
              <Toggle label="Temporal split" hint="First 80% train / last 20% test — prevents data leakage" checked={temporal} onChange={setTemporal} />
            </div>

            <button className="btn-solid w-full justify-center" disabled={busy} onClick={train}>
              {busy ? 'Training…' : model?.trained ? 'Retrain Model' : 'Train Model'}
            </button>

            {model?.trained && m?.train_elapsed_s != null && (
              <div className="text-2xs text-zinc-500 text-center">
                Last train: <span className="num">{fmtScore(m.train_elapsed_s, 2)}s</span> · {m.split_method} split
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="lg:col-span-2 panel overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Model Performance</span>
            {model?.trained && <span className="num text-2xs text-signal-low">● Trained</span>}
          </div>
          {m ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                <Metric label="ROC AUC" value={fmtScore(m.roc_auc, 4)} accent="#4aa8ff" />
                <Metric label="PR AUC" value={fmtScore(m.pr_auc, 4)} accent="#f5b83d" />
                <Metric label="F1" value={fmtScore(m.f1, 4)} />
                <Metric label="Precision" value={fmtScore(m.precision, 4)} />
                <Metric label="Recall" value={fmtScore(m.recall, 4)} />
              </div>
              {m.cv_mean != null && (
                <div className="text-2xs text-zinc-500">
                  Cross-validation F1 (stratified 5-fold): <span className="num text-zinc-300">{fmtScore(m.cv_mean, 4)} ± {fmtScore(m.cv_std, 4)}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="kicker mb-2">ROC Curve</div>
                  {m.roc_fpr && m.roc_tpr ? (
                    <ROCChart fpr={m.roc_fpr} tpr={m.roc_tpr} auc={m.roc_auc} />
                  ) : (
                    <div className="text-xs text-zinc-600 py-8 text-center">ROC data unavailable</div>
                  )}
                </div>
                <div>
                  <div className="kicker mb-2">Confusion Matrix</div>
                  <ConfusionMatrix cm={m.confusion_matrix} />
                  <div className="mt-2 text-2xs text-zinc-500">
                    Fraud caught: <span className="num text-signal-low">{m.confusion_matrix?.[1]?.[1]?.toLocaleString()}</span>
                    {' · '}Missed: <span className="num text-signal-fraud">{m.confusion_matrix?.[1]?.[0]?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-sm text-zinc-600 text-center">Model not trained yet.</div>
          )}
        </div>
      </div>

      {/* Feature importance */}
      {m && (
        <div className="panel p-4">
          <div className="panel-header px-0">
            <span className="panel-title">Feature Importance — Top Signals</span>
          </div>
          <div className="pt-3">
            <BarList items={importances} maxItems={15} format={(v) => fmtScore(v, 4)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div className="bg-ink-900 border border-line rounded p-3">
      <div className="kicker">{label}</div>
      <div className="num text-xl font-semibold mt-1" style={accent ? { color: accent } : { color: '#fafafa' }}>{value}</div>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <button className="flex items-start gap-3 w-full text-left" onClick={() => onChange(!checked)}>
      <span
        className={`w-8 h-[18px] rounded-full shrink-0 mt-0.5 relative transition-colors border ${
          checked ? 'bg-signal-high/70 border-signal-high' : 'bg-ink-800 border-line'
        }`}
      >
        <span
          className={`absolute top-[1px] w-3.5 h-3.5 rounded-full bg-zinc-100 transition-all ${
            checked ? 'left-[15px]' : 'left-[1px]'
          }`}
        />
      </span>
      <span>
        <span className="block text-[0.8125rem] text-zinc-200 font-medium">{label}</span>
        <span className="block text-2xs text-zinc-500 mt-0.5">{hint}</span>
      </span>
    </button>
  )
}