export function StatCard({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'warm'
      ? 'from-ember-500/20 to-transparent'
      : tone === 'danger'
        ? 'from-rose-500/20 to-transparent'
        : tone === 'success'
          ? 'from-pine-500/20 to-transparent'
          : 'from-tide-500/20 to-transparent';

  return (
    <article className={`glass-panel bg-gradient-to-br ${toneClass} p-5`}>
      <p className="text-xs uppercase tracking-[0.22em] text-sand-100/55">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold text-white">{value}</p>
    </article>
  );
}
