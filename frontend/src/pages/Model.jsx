import React, { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import api from '../api'
import { useApp } from '../context'
import { ConfusionMatrix, ROCChart, BarList } from '../components/charts'
import { fmtScore, fmtPct } from '../lib/format'
import { COLORS } from '../lib/theme'

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
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Load a dataset first to train a model.</p>
      </div>
    )
  }

  const m = model?.metrics
  const importances = m ? Object.entries(m.feature_importances || {}) : []

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Training config */}
        <div className="panel h-fit">
          <div className="panel-header"><span className="panel-title">Training Configuration</span></div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/70">
              <span className="text-slate-500 dark:text-slate-400">Dataset</span>
              <span className="num text-xs font-semibold text-slate-700 dark:text-slate-200">{data.total?.toLocaleString()} rows · {data.dataset_type}</span>
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

            <div className="space-y-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
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
            {model?.trained && <span className="num inline-flex items-center gap-1 text-2xs text-signal-low"><CircleCheck size={13} aria-hidden="true" /> Trained</span>}
          </div>
          {m ? (
            <div className="space-y-6 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                <Metric label="ROC AUC" value={fmtScore(m.roc_auc, 4)} accent={COLORS.info} />
                <Metric label="PR AUC" value={fmtScore(m.pr_auc, 4)} accent={COLORS.amber} />
                <Metric label="F1" value={fmtScore(m.f1, 4)} />
                <Metric label="Precision" value={fmtScore(m.precision, 4)} />
                <Metric label="Recall" value={fmtScore(m.recall, 4)} />
              </div>
              {m.cv_mean != null && (
                <div className="text-2xs text-zinc-500">
                  Random Forest cross-validation F1 (training partition): <span className="num text-zinc-300">{fmtScore(m.cv_mean, 4)} ± {fmtScore(m.cv_std, 4)}</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <span className="panel-title">Feature Importance — Top Signals</span>
          </div>
          <div className="p-5 sm:p-6">
            <BarList items={importances} maxItems={15} format={(v) => fmtScore(v, 4)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
      <div className="kicker">{label}</div>
      <div className="num mt-2 text-xl font-bold text-slate-900 dark:text-white" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <button className="flex w-full items-start gap-3 rounded-xl p-1 text-left transition-colors hover:bg-white dark:hover:bg-slate-800" onClick={() => onChange(!checked)}>
      <span
        className={`w-8 h-[18px] rounded-full shrink-0 mt-0.5 relative transition-colors border ${
          checked ? 'border-sky-600 bg-sky-600 dark:border-sky-500 dark:bg-sky-500' : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-[1px] w-3.5 h-3.5 rounded-full bg-zinc-100 transition-all ${
            checked ? 'left-[15px]' : 'left-[1px]'
          }`}
        />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </button>
  )
}
