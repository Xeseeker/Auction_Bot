import { useState } from 'react';
import { DataTable } from '../components/DataTable.jsx';
import { PaginationControls } from '../components/PaginationControls.jsx';
import { Panel } from '../components/Panel.jsx';
import { useLocale } from '../lib/useLocale.js';

export function AuditLogsPage({ logs, pagination, loading, error, onSearch, onPageChange }) {
  const { t } = useLocale();
  const [filters, setFilters] = useState({ actor: '', action: '', entityType: '' });

  const submit = (event) => {
    event.preventDefault();
    onSearch(filters);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">{t('audit_tag')}</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">{t('audit_title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">{t('audit_subtitle')}</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <Panel
        title={t('audit_directory')}
        subtitle={t('audit_directory_subtitle')}
        actions={
          <form className="flex w-full min-w-0 flex-wrap items-center gap-2" onSubmit={submit}>
            <input
              className="field h-10 w-full px-3 py-2 text-xs sm:w-48"
              onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))}
              placeholder={t('audit_actor_placeholder')}
              value={filters.actor}
            />
            <input
              className="field h-10 w-full px-3 py-2 text-xs sm:w-48"
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
              placeholder={t('audit_action_placeholder')}
              value={filters.action}
            />
            <select
              className="field h-10 w-[calc(50%-0.25rem)] min-w-32 px-3 py-2 text-xs sm:w-36"
              onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))}
              value={filters.entityType}
            >
              <option value="">{t('all_entities')}</option>
              <option value="auction">{t('entity_auction')}</option>
              <option value="user">{t('entity_user')}</option>
              <option value="session">{t('entity_session')}</option>
              <option value="system">{t('entity_system')}</option>
            </select>
            <button className="btn-primary h-10 w-auto px-4 py-2 text-xs" disabled={loading} type="submit">
              {loading ? t('loading') : t('apply')}
            </button>
          </form>
        }
      >
        <DataTable
          rows={logs}
          columns={[
            { key: 'time', label: t('time_label'), render: (row) => new Date(row.createdAt).toLocaleString() },
            { key: 'actor', label: t('audit_actor'), render: (row) => row.actor },
            { key: 'action', label: t('audit_action'), render: (row) => row.action },
            { key: 'entity', label: t('audit_entity'), render: (row) => row.entityType },
            { key: 'reason', label: t('audit_reason'), render: (row) => row.reason || t('none') },
          ]}
        />
        <PaginationControls loading={loading} onPageChange={onPageChange} pagination={pagination} />
      </Panel>
    </div>
  );
}
