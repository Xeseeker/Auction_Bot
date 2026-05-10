import { NavLink } from 'react-router-dom';
import { useLocale } from '../lib/i18n.jsx';

export function AppShell({ adminUser, onLogout, socketConnected, children }) {
  const { locale, setLocale, t } = useLocale();
  const links = [
    { to: '/', label: t('nav_dashboard'), end: true },
    { to: '/auctions', label: t('nav_auctions') },
    { to: '/users', label: t('nav_users') },
    { to: '/stats', label: t('nav_statistics') },
    { to: '/audit-logs', label: t('nav_audit_logs') },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-ink-900/95 p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden lg:border-b-0 lg:border-r">
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">{t('control_center')}</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">{t('app_title')}</h1>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-sand-50">
          <span>{socketConnected ? t('live_connected') : t('live_disconnected')}</span>
          <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-pine-400' : 'bg-rose-400'}`} />
        </div>

        <nav className="mt-5 grid gap-1.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white text-ink-950' : 'bg-white/5 text-sand-50 hover:bg-white/10'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.22em] text-sand-100/45">{t('signed_in')}</p>
          <p className="mt-1 text-sm font-semibold text-white">{adminUser?.username}</p>
          <label className="mt-3 block text-xs uppercase tracking-[0.2em] text-sand-100/45">{t('locale_label')}</label>
          <select
            className="field mt-1 h-10 rounded-xl px-3 py-2 text-xs"
            onChange={(event) => setLocale(event.target.value)}
            value={locale}
          >
            <option value="en">English</option>
            <option value="sw">Kiswahili</option>
            <option value="am">አማርኛ</option>
          </select>
          <button className="btn-secondary mt-3 h-10 w-full px-4 py-2 text-xs" onClick={onLogout} type="button">
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
