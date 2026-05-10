export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`glass-panel min-w-0 p-5 ${className}`}>
      {(title || subtitle || actions) && (
        <header className="mb-5 flex min-w-0 flex-col gap-4">
          <div className="min-w-0">
            {title && <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-sand-100/60">{subtitle}</p>}
          </div>
          {actions ? <div className="flex w-full min-w-0 flex-wrap items-center gap-3">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
