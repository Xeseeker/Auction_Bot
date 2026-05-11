import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { PaginationControls } from '../components/PaginationControls.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useLocale } from '../lib/i18n.jsx';

const person = (user, fallback) =>
  user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fallback;

export function UsersPage({
  users,
  pagination,
  loading,
  error,
  onSearch,
  onPageChange,
  onBanToggle,
  onApprovalReview,
}) {
  const { t } = useLocale();
  const [filters, setFilters] = useState({ search: '', role: 'all', banned: '', sellerApproval: 'all' });
  const [pendingAction, setPendingAction] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    onSearch(filters);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">{t('users_tag')}</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">{t('users_title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">{t('users_subtitle')}</p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <Panel
        title={t('accounts_title')}
        subtitle={t('accounts_subtitle')}
        actions={
          <form className="flex w-full min-w-0 flex-wrap items-center gap-2" onSubmit={submit}>
            <input
              className="field h-10 w-full px-3 py-2 text-xs sm:w-56 lg:w-64"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={t('user_search_placeholder')}
              value={filters.search}
            />
            <select
              className="field h-10 w-[calc(50%-0.25rem)] min-w-28 px-3 py-2 text-xs sm:w-32"
              onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
              value={filters.role}
            >
              <option value="all">{t('all_roles')}</option>
              <option value="user">{t('status_user')}</option>
              <option value="admin">{t('status_admin')}</option>
            </select>
            <select
              className="field h-10 w-[calc(50%-0.25rem)] min-w-36 px-3 py-2 text-xs sm:w-40"
              onChange={(event) => setFilters((current) => ({ ...current, sellerApproval: event.target.value }))}
              value={filters.sellerApproval}
            >
              <option value="all">{t('any_approval')}</option>
              <option value="pending">{t('status_pending')}</option>
              <option value="approved">{t('status_approved')}</option>
              <option value="rejected">{t('status_rejected')}</option>
              <option value="not_requested">{t('status_not_requested')}</option>
            </select>
            <select
              className="field h-10 w-[calc(50%-0.25rem)] min-w-32 px-3 py-2 text-xs sm:w-36"
              onChange={(event) => setFilters((current) => ({ ...current, banned: event.target.value }))}
              value={filters.banned}
            >
              <option value="">{t('any_access')}</option>
              <option value="false">{t('active_only')}</option>
              <option value="true">{t('banned_only')}</option>
            </select>
            <button className="btn-primary h-10 w-auto px-4 py-2 text-xs" disabled={loading} type="submit">
              {loading ? t('loading') : t('apply')}
            </button>
          </form>
        }
      >
        <DataTable
          rows={users}
          columns={[
            { key: 'user', label: t('user_label'), render: (row) => person(row, t('not_available')) },
            { key: 'telegramId', label: t('telegram_id'), render: (row) => row.telegramId },
            { key: 'role', label: t('role_label'), render: (row) => <StatusBadge value={row.role} /> },
            {
              key: 'access',
              label: t('access_label'),
              render: (row) => <StatusBadge value={row.banned ? 'banned' : 'active'} />,
            },
            {
              key: 'sellerApproval',
              label: t('seller_approval'),
              render: (row) => (
                <StatusBadge value={row.sellerApprovalStatus || (row.sellerApproved ? 'approved' : 'not_requested')} />
              ),
            },
            {
              key: 'requested',
              label: t('requested_label'),
              render: (row) =>
                row.approvalRequestedAt ? new Date(row.approvalRequestedAt).toLocaleString() : t('not_available'),
            },
            {
              key: 'reviewedBy',
              label: t('review_by'),
              render: (row) => row.approvedBy || t('not_available'),
            },
            {
              key: 'watchlist',
              label: t('watchlist_count'),
              render: (row) => row.watchlist?.length || 0,
            },
            {
              key: 'action',
              label: t('actions_label'),
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-secondary"
                    disabled={row.sellerApproved}
                    onClick={() => onApprovalReview(row._id, true)}
                    type="button"
                  >
                    {row.sellerApproved ? t('status_approved') : t('approve')}
                  </button>
                  <button
                    className="btn-danger"
                    disabled={row.sellerApprovalStatus === 'not_requested'}
                    onClick={() => setPendingAction({ type: 'rejectSeller', user: row })}
                    type="button"
                  >
                    {t('reject')}
                  </button>
                  <button
                    className={row.banned ? 'btn-secondary' : 'btn-danger'}
                    onClick={() => setPendingAction({ type: row.banned ? 'unban' : 'ban', user: row })}
                    type="button"
                  >
                    {row.banned ? t('unban') : t('ban')}
                  </button>
                </div>
              ),
            },
          ]}
        />
        <PaginationControls loading={loading} onPageChange={onPageChange} pagination={pagination} />
      </Panel>

      <ConfirmDialog
        confirmLabel={
          pendingAction?.type === 'rejectSeller' ? t('reject') : pendingAction?.type === 'unban' ? t('unban') : t('ban')
        }
        message={
          pendingAction?.type === 'rejectSeller'
            ? t('reject_user_confirm')
            : pendingAction?.type === 'unban'
              ? t('unban_user_confirm')
              : t('ban_user_confirm')
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction?.user) {
            return;
          }

          if (pendingAction.type === 'rejectSeller') {
            onApprovalReview(pendingAction.user._id, false, reason);
          } else {
            onBanToggle(pendingAction.user._id, pendingAction.type === 'ban', reason);
          }

          setPendingAction(null);
        }}
        open={Boolean(pendingAction)}
        reasonLabel={pendingAction?.type === 'unban' ? undefined : t('reason_label')}
        reasonPlaceholder={
          pendingAction?.type === 'rejectSeller' ? t('rejection_reason_prompt') : t('ban_reason_prompt')
        }
        title={
          pendingAction?.type === 'rejectSeller' ? t('reject') : pendingAction?.type === 'unban' ? t('unban') : t('ban')
        }
        tone={pendingAction?.type === 'unban' ? 'primary' : 'danger'}
      />
    </div>
  );
}
