export function Panel({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`glass-panel p-5 ${className}`}>
      {(title || subtitle || actions) && (
        <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title && <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-sand-100/60">{subtitle}</p>}
          </div>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
