import { useLocale } from '../lib/i18n.jsx';

const statusStyles = {
  active: 'bg-pine-500/20 text-pine-400',
  ended: 'bg-tide-500/20 text-tide-300',
  cancelled: 'bg-rose-500/20 text-rose-400',
  pending: 'bg-amber-500/20 text-amber-300',
  banned: 'bg-rose-500/20 text-rose-400',
  approved: 'bg-pine-500/20 text-pine-400',
  rejected: 'bg-rose-500/20 text-rose-400',
  not_requested: 'bg-white/10 text-sand-50',
  admin: 'bg-ember-500/20 text-ember-400',
  user: 'bg-white/10 text-sand-50',
  standard: 'bg-sky-500/20 text-sky-300',
  dutch: 'bg-amber-500/20 text-amber-300',
  sealed_bid: 'bg-violet-500/20 text-violet-300',
  reverse: 'bg-cyan-500/20 text-cyan-300',
};

export function StatusBadge({ value }) {
  const { t } = useLocale();
  const formatLabel = (statusValue) => {
    const normalized = String(statusValue || '').replace(/[^a-z_]/gi, '').toLowerCase();
    const translated = t(`status_${normalized}`);
    return translated.startsWith('status_') ? normalized.replace(/_/g, ' ') : translated;
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        statusStyles[value] || 'bg-white/10 text-sand-50'
      }`}
    >
      {formatLabel(value)}
    </span>
  );
}
