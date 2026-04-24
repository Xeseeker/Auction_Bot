import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/auctions', label: 'Auctions' },
  { to: '/users', label: 'Users' },
  { to: '/stats', label: 'Statistics' },
];

export function AppShell({ adminUser, onLogout, children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-ink-900/95 p-6 lg:min-h-screen lg:border-b-0 lg:border-r">
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Control center</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-white">Auction Admin</h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-sand-100/60">
          Moderate listings, inspect bidding activity, and keep the marketplace healthy.
        </p>

        <nav className="mt-8 grid gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-white text-ink-950' : 'bg-white/5 text-sand-50 hover:bg-white/10'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-sand-100/45">Signed in</p>
          <p className="mt-2 font-semibold text-white">{adminUser?.username}</p>
          <button className="btn-secondary mt-4 w-full" onClick={onLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
