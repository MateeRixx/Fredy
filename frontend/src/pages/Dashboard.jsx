import React, { useEffect, useState } from 'react'
import api from '../api'
import { DataModule } from '../components/DataModule'
import { RiskDistributionBar, RiskLegend, Gauge, Sparkline, ScoreHistogram } from '../components/charts'
import { fmtNum, fmtPct, fmtScore, riskTone, fmtTime } from '../lib/format'

function Kpi({ label, value, sub, tone = 'text-zinc-100' }) {
  return (
    <div className="panel px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="kicker">{label}</span>
        {sub && <span className="text-2xs text-zinc-600">{sub}</span>}
      </div>
      <div className={`num text-[1.6rem] font-semibold mt-1 tracking-tight ${tone}`}>{value}</div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [model, setModel] = useState(null)
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [scored, setScored] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const [ds, ms, st, al, sc] = await Promise.all([
        api.dataStatus(),
        api.modelStatus(),
        api.scoreStats(),
        api.alerts('?limit=50'),
        api.scored('?limit=12'),
      ])
      setData(ds)
      setModel(ms)
      setStats(st)
      setAlerts(al)
      setScored(sc)
    } catch {
      /* one of them may 400 when nothing loaded; ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  if (!data?.loaded) {
    return (
      <div className="p-6 flex flex-col items-center gap-8">
        <div className="text-center pt-8">
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">No dataset loaded</h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-md">
            Initialize the pipeline to start. Generate synthetic transactions, a ULB-format dataset, or upload your own CSV.
          </p>
        </div>
        <DataModule onLoaded={refresh} />
      </div>
    )
  }

  const dist = stats?.risk_distribution || {}
  const histScores = scored?.rows?.map((r) => r.hybrid_score) || []
  const histLabels = scored?.rows?.map((r) => r.is_fraud ?? 0) || []

  const metrics = model?.metrics
  const conf = metrics?.confusion_matrix
  const detectedFraud = conf ? conf[1][1] : null
  const missedFraud = conf ? conf[1][0] : null

  const lastAlerts = alerts?.alerts || []
  const spark = scored?.rows?.length ? scored.rows.slice().reverse().map((r) => r.hybrid_score) : []

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Transactions" value={fmtNum(data.total)} sub={data.source} />
        <Kpi label="Fraudulent" value={fmtNum(data.fraud)} tone="text-signal-fraud" sub={fmtPct(data.fraud_rate)} />
        <Kpi label="Open Alerts" value={fmtNum(alerts?.open)} tone="text-signal-high" sub="threshold queue" />
        <Kpi label="Alert FP Rate" value={fmtPct(alerts?.false_positive_rate ?? 0)} sub="analyst feedback" />
        <Kpi
          label="ROC AUC"
          value={metrics ? fmtScore(metrics.roc_auc, 4) : '—'}
          tone={metrics ? 'text-signal-cyan' : 'text-zinc-600'}
          sub={metrics?.split_method || 'model'}
        />
        <Kpi label="F1 Score" value={metrics ? fmtScore(metrics.f1, 4) : '—'} tone={metrics ? 'text-zinc-100' : 'text-zinc-600'} sub="hybrid blend" />
      </div>

      {/* Risk distribution */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="panel-title">Risk Distribution — All Scored Transactions</span>
          <span className="num text-2xs text-zinc-500">{fmtNum(stats?.total || 0)} scored</span>
        </div>
        <RiskDistributionBar distribution={dist} height={16} />
        <RiskLegend distribution={dist} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Model panel */}
        <div className="lg:col-span-1 panel p-5 flex flex-col items-center gap-4">
          <span className="panel-title">Model Signal</span>
          <Gauge
            value={metrics?.roc_auc ?? 0}
            label={metrics ? `ROC AUC · ${metrics.split_method}` : 'Not trained'}
            color={metrics?.roc_auc >= 0.85 ? '#26d9a0' : '#f5b83d'}
          />
          {metrics && (
            <div className="w-full grid grid-cols-2 gap-2 text-center">
              <MetricCell label="Precision" value={fmtScore(metrics.precision, 3)} />
              <MetricCell label="Recall" value={fmtScore(metrics.recall, 3)} />
              <MetricCell label="PR AUC" value={fmtScore(metrics.pr_auc, 3)} />
              <MetricCell label="CV Mean" value={metrics.cv_mean != null ? fmtScore(metrics.cv_mean, 3) : '—'} />
            </div>
          )}
        </div>

        {/* Score histogram */}
        <div className="lg:col-span-2 panel p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="panel-title">Hybrid Score Distribution</span>
            <div className="flex items-center gap-3 text-2xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 bg-[#243046]" /> Legit</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 bg-signal-fraud" /> Fraud</span>
            </div>
          </div>
          <ScoreHistogram scores={histScores} labels={histLabels} thresholds={[['crit', 0.7], ['high', 0.5], ['med', 0.3]]} />
          <div className="mt-2 flex justify-between text-2xs text-zinc-600 num">
            <span>0.00</span><span>0.30</span><span>0.50</span><span>0.70</span><span>1.00</span>
          </div>
          {metrics?.split_method && (
            <div className="mt-3 text-2xs text-zinc-500">
              Split: <span className="num text-zinc-300">{metrics.split_method}</span>
              {metrics.cv_mean != null && <> · CV F1: <span className="num text-zinc-300">{fmtScore(metrics.cv_mean, 4)} ± {fmtScore(metrics.cv_std, 4)}</span></>}
              {metrics.train_elapsed_s != null && <> · Trained in <span className="num text-zinc-300">{fmtScore(metrics.train_elapsed_s, 2)}s</span></>}
            </div>
          )}
        </div>
      </div>

      {/* Bottom grid: recent alerts + detection summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Highest-Risk Alerts</span>
            <a href="#/alerts" className="text-2xs text-signal-cyan hover:underline">Open queue →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr><th>ID</th><th>Risk</th><th>Score</th><th>Time</th></tr>
              </thead>
              <tbody>
                {lastAlerts.slice(0, 8).map((a) => {
                  const t = riskTone(a.risk_level)
                  return (
                    <tr key={a.alert_id}>
                      <td className="num text-zinc-400">{a.alert_id}</td>
                      <td><span className={`badge ${t.badge}`}>{a.risk_level}</span></td>
                      <td className="num text-zinc-200">{fmtScore(a.hybrid_score)}</td>
                      <td className="num text-zinc-500 text-2xs">{fmtTime(a.created_at)}</td>
                    </tr>
                  )
                })}
                {!lastAlerts.length && <tr><td colSpan={4} className="text-zinc-600 text-center py-6">No alerts generated</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Detection Summary</span>
          </div>
          <div className="p-4">
            {conf ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-ink-900 border border-line rounded p-3">
                    <div className="kicker">Fraud caught</div>
                    <div className="num text-xl text-signal-low font-semibold mt-1">{fmtNum(detectedFraud)}</div>
                  </div>
                  <div className="bg-ink-900 border border-line rounded p-3">
                    <div className="kicker">Fraud missed</div>
                    <div className="num text-xl text-signal-fraud font-semibold mt-1">{fmtNum(missedFraud)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-2xs text-zinc-500">
                  <Sparkline data={spark} width={140} height={28} stroke={model?.metrics?.roc_auc >= 0.85 ? '#26d9a0' : '#f5b83d'} />
                  <span className="truncate">Last scored batch, hybrid score trend</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500 py-4 text-center">
                Train the model to view detection metrics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCell({ label, value }) {
  return (
    <div className="bg-ink-900 border border-line rounded p-2">
      <div className="kicker">{label}</div>
      <div className="num text-[0.9375rem] text-zinc-100 mt-0.5">{value}</div>
    </div>
  )
}