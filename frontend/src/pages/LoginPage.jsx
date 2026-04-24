import { useState } from 'react';

export function LoginPage({ onLogin, loading }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await onLogin(form);
    } catch (apiError) {
      setError(apiError.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="glass-panel hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Telegram Auction</p>
            <h1 className="mt-4 max-w-lg font-display text-5xl font-bold leading-tight text-white">
              Frontend admin cockpit for a busy public auction marketplace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-sand-100/60">
              Review platform performance, handle risky auctions, ban abusive users, and spot bidding trends from one responsive panel.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-sand-100/45">Operations</p>
              <p className="mt-3 font-display text-2xl text-white">Live metrics</p>
            </div>
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-sand-100/45">Safety</p>
              <p className="mt-3 font-display text-2xl text-white">Fast moderation</p>
            </div>
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-sand-100/45">Insights</p>
              <p className="mt-3 font-display text-2xl text-white">Chart-driven</p>
            </div>
          </div>
        </section>

        <section className="glass-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Admin login</p>
          <h2 className="mt-4 font-display text-3xl font-bold text-white">Sign in</h2>
          <p className="mt-2 text-sm text-sand-100/60">
            Use the backend admin credentials from your environment file.
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm text-sand-100/65">Username</span>
              <input
                className="field"
                name="username"
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                required
                value={form.username}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-sand-100/65">Password</span>
              <input
                className="field"
                name="password"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={form.password}
              />
            </label>
            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? 'Signing in...' : 'Open admin panel'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
