import { useState } from 'react';
import { DataTable } from '../components/DataTable.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

const person = (user) => (user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A');

export function UsersPage({ users, loading, error, onSearch, onBanToggle }) {
  const [filters, setFilters] = useState({ search: '', role: 'all', banned: '' });

  const submit = (event) => {
    event.preventDefault();
    onSearch(filters);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Safety</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">User management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">
          Search platform accounts, review roles, and apply bans with a clear moderation trail.
        </p>
      </header>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <Panel
        title="Accounts"
        subtitle="Filter by role or restriction status"
        actions={
          <form className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_160px_160px_auto]" onSubmit={submit}>
            <input
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Username, name, or Telegram ID"
              value={filters.search}
            />
            <select
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
              value={filters.role}
            >
              <option value="all">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <select
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, banned: event.target.value }))}
              value={filters.banned}
            >
              <option value="">Any status</option>
              <option value="false">Active only</option>
              <option value="true">Banned only</option>
            </select>
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </form>
        }
      >
        <DataTable
          rows={users}
          columns={[
            { key: 'user', label: 'User', render: (row) => person(row) },
            { key: 'telegramId', label: 'Telegram ID', render: (row) => row.telegramId },
            { key: 'role', label: 'Role', render: (row) => <StatusBadge value={row.role} /> },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusBadge value={row.banned ? 'banned' : 'active'} />,
            },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <button
                  className={row.banned ? 'btn-secondary' : 'btn-danger'}
                  onClick={() => {
                    const reason = row.banned ? '' : window.prompt('Optional ban reason:') || '';
                    onBanToggle(row._id, !row.banned, reason);
                  }}
                  type="button"
                >
                  {row.banned ? 'Unban' : 'Ban'}
                </button>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
