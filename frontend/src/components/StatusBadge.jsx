const statusStyles = {
  active: 'bg-pine-500/20 text-pine-400',
  ended: 'bg-tide-500/20 text-tide-300',
  cancelled: 'bg-rose-500/20 text-rose-400',
  pending: 'bg-amber-500/20 text-amber-300',
  banned: 'bg-rose-500/20 text-rose-400',
  admin: 'bg-ember-500/20 text-ember-400',
  user: 'bg-white/10 text-sand-50',
};

export function StatusBadge({ value }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        statusStyles[value] || 'bg-white/10 text-sand-50'
      }`}
    >
      {value}
    </span>
  );
}
