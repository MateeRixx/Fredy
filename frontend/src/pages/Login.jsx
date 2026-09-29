import React, { useState } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import api from '../api'
import BrandMark from '../components/BrandMark'
import ThemeToggle from '../components/ThemeToggle'

const DEFAULT_EMAIL = 'mohitrkumar2512@gmail.com'

export default function Login({ onAuthenticated }) {
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const signIn = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const session = await api.login(email, password)
      onAuthenticated(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-shell">
      <div className="login-grid" aria-hidden="true" />
      <div className="login-scanline" aria-hidden="true" />

      <header className="login-masthead">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <div className="text-xs font-semibold tracking-[0.16em] text-zinc-100">FREDY</div>
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-zinc-600">Transaction intelligence</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 text-2xs font-mono uppercase tracking-[0.16em] text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-low pulse-dot" />
            Gateway operational
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1240px] items-center gap-12 px-6 pb-10 pt-24 lg:grid-cols-[1.25fr_0.75fr] lg:px-12">
        <section className="max-w-3xl py-8">
          <div className="mb-8 flex items-center gap-3 text-2xs font-mono uppercase tracking-[0.18em] text-amber-400">
            <span className="h-px w-10 bg-amber-400" />
            Secure analyst gateway / FC-02
          </div>
          <h1 className="login-title">
            Every transaction
            <span>leaves a trail.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">
            Enter the command layer for live risk scoring, anomaly detection, and alert triage.
            One console. Every signal in view.
          </p>

          <div className="trace-panel mt-12" aria-label="Live transaction risk trace">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-2xs font-mono uppercase tracking-[0.14em] text-zinc-600">
              <span>Live signal trace</span>
              <span className="text-signal-low">Monitoring</span>
            </div>
            <div className="relative h-36 overflow-hidden">
              <div className="absolute inset-y-0 left-4 flex flex-col justify-around text-[0.58rem] font-mono text-zinc-700">
                <span>1.00</span><span>0.50</span><span>0.00</span>
              </div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 720 150" preserveAspectRatio="none" role="img">
                <title>Transaction risk signal with one detected anomaly</title>
                <path className="trace-path trace-path-muted" d="M28 108 L95 102 L142 105 L191 93 L248 101 L300 89 L351 95 L402 74 L453 83 L505 78 L552 30 L605 73 L692 66" />
                <path className="trace-path" d="M28 108 L95 102 L142 105 L191 93 L248 101 L300 89 L351 95 L402 74 L453 83 L505 78 L552 30 L605 73 L692 66" />
                <line className="text-signal-fraud" x1="552" y1="18" x2="552" y2="132" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" opacity="0.55" />
                <circle className="trace-alert-node" cx="552" cy="30" r="5" strokeWidth="2" />
              </svg>
              <div className="absolute right-[15%] top-4 font-mono text-[0.62rem] uppercase tracking-widest text-signal-fraud">Anomaly isolated</div>
            </div>
          </div>
        </section>

        <section className="login-card" aria-labelledby="login-heading">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <div className="kicker mb-2">Identity checkpoint</div>
              <h2 id="login-heading" className="text-xl font-semibold tracking-tight text-zinc-100">Analyst access</h2>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-ink-900 text-signal-cyan shadow-sm" aria-hidden="true">
              <LockKeyhole size={16} strokeWidth={1.7} aria-hidden="true" />
            </div>
          </div>

          <form className="space-y-5 px-6 py-6" onSubmit={signIn}>
            <label className="block space-y-2">
              <span className="label">Email</span>
              <input
                className="login-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="label">Password</span>
              <input
                className="login-input"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your access key"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300" role="alert">
                {error}
              </div>
            )}

            <button className="login-submit" type="submit" disabled={busy}>
              <span>{busy ? 'Verifying access…' : 'Enter command console'}</span>
              {!busy && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>

          <div className="flex items-center gap-2 border-t border-line px-6 py-4 text-2xs text-zinc-600">
            <ShieldCheck size={14} className="text-signal-low" aria-hidden="true" />
            Encrypted session · expires after 12 hours
          </div>
        </section>
      </div>
    </main>
  )
}

function Mark() {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-ink-850 shadow-sm">
      <BrandMark size={18} />
    </div>
  )
}
