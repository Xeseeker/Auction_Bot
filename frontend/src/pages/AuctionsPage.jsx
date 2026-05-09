import { useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { adminApi } from '../lib/api.js';
import { useLocale } from '../lib/i18n.jsx';

const currency = (value) => `${Number(value || 0).toLocaleString()} ETB`;
const person = (user, fallback) => (user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fallback);

export function AuctionsPage({
  auctions,
  selectedAuction,
  loading,
  detailLoading,
  error,
  onSearch,
  onSelect,
  onCancel,
  onApprove,
  onReject,
}) {
  const { t } = useLocale();
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const querySummary = useMemo(
    () => (filters.search ? `${t('search_label')}: ${filters.search}` : filters.status === 'all' ? t('all_auctions') : `${t('status_label')}: ${t(`status_${filters.status}`)}`),
    [filters, t]
  );

  const submit = (event) => {
    event.preventDefault();
    onSearch(filters);
  };

  const auction = selectedAuction?.auction;
  const mediaAssets = auction
    ? [
        ...(auction.mediaAssets || []),
        ...(auction.imageUrl ? [{ _id: 'legacy-image', kind: 'photo' }] : []),
        ...(auction.videoUrl ? [{ _id: 'legacy-video', kind: 'video' }] : []),
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">{t('auctions_tag')}</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">{t('auctions_title')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">
          {t('auctions_subtitle')}
        </p>
      </header>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      <Panel
        title={t('auction_directory')}
        subtitle={querySummary}
        actions={
          <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_auto]" onSubmit={submit}>
            <input
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={t('auction_search_placeholder')}
              value={filters.search}
            />
            <select
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              value={filters.status}
            >
              <option value="all">{t('all_statuses')}</option>
              <option value="pending">{t('status_pending')}</option>
              <option value="active">{t('status_active')}</option>
              <option value="ended">{t('status_ended')}</option>
              <option value="cancelled">{t('status_cancelled')}</option>
            </select>
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? t('loading') : t('apply')}
            </button>
          </form>
        }
      >
        <DataTable
          rows={auctions}
          columns={[
            {
              key: 'item',
              label: t('item_label'),
              render: (row) => (
                <button className="text-left font-semibold text-tide-300 hover:text-tide-200" onClick={() => onSelect(row._id)} type="button">
                  {row.itemName}
                </button>
              ),
            },
            { key: 'seller', label: t('seller_label'), render: (row) => person(row.seller, t('not_available')) },
            { key: 'status', label: t('status_label'), render: (row) => <StatusBadge value={row.status} /> },
            { key: 'type', label: t('auction_type'), render: (row) => <StatusBadge value={row.auctionType || 'standard'} /> },
            { key: 'category', label: t('category_label'), render: (row) => row.category || t('not_available') },
            { key: 'bid', label: t('current_bid_label'), render: (row) => currency(row.currentBid) },
            { key: 'ends', label: t('ends_label'), render: (row) => new Date(row.endTime).toLocaleString() },
          ]}
        />
      </Panel>

      <Panel
        title={t('auction_detail')}
        subtitle={auction ? auction.description : t('select_auction_detail')}
        actions={
          auction?.status === 'pending' ? (
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => onApprove(auction._id)} type="button">
                {t('approve_auction')}
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  const reason = window.prompt(t('reject_reason_prompt')) || '';
                  onReject(auction._id, reason);
                }}
                type="button"
              >
                {t('reject_auction')}
              </button>
            </div>
          ) : auction?.status === 'active' ? (
            <button
              className="btn-danger"
              onClick={() => {
                const reason = window.prompt(t('cancel_reason_prompt')) || '';
                onCancel(auction._id, reason);
              }}
              type="button"
            >
              {t('cancel_auction')}
            </button>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-sand-100/55">
            {t('loading_auction_detail')}
          </div>
        ) : selectedAuction ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('status_label')}</p>
                <div className="mt-3"><StatusBadge value={auction.status} /></div>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('seller_label')}</p>
                <p className="mt-3 font-semibold text-white">{person(auction.seller, t('not_available'))}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('highest_bidder')}</p>
                <p className="mt-3 font-semibold text-white">{person(auction.highestBidder, t('not_available'))}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('current_bid_label')}</p>
                <p className="mt-3 font-semibold text-white">{currency(auction.currentBid)}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('auction_type')}</p>
                <div className="mt-3">
                  <StatusBadge value={auction.auctionType || 'standard'} />
                </div>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('reserve_label')}</p>
                <p className="mt-3 font-semibold text-white">{auction.reservePrice ? currency(auction.reservePrice) : t('none')}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('buy_now_label')}</p>
                <p className="mt-3 font-semibold text-white">{auction.buyNowPrice ? currency(auction.buyNowPrice) : t('none')}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('category_label')}</p>
                <p className="mt-3 font-semibold text-white">{auction.category || t('not_available')}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('tags_label')}</p>
                <p className="mt-3 font-semibold text-white">{auction.tags?.length ? auction.tags.join(', ') : t('none')}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{t('bid_increment')}</p>
                <p className="mt-3 font-semibold text-white">{currency(auction.bidIncrement || 1)}</p>
              </div>
            </div>

            <Panel title={t('media_gallery')} subtitle={mediaAssets.length ? t('media_count', { count: String(mediaAssets.length) }) : t('no_media')}>
              {mediaAssets.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {mediaAssets.map((asset) =>
                    asset.kind === 'video' ? (
                      <video
                        key={asset._id}
                        className="w-full rounded-3xl border border-white/10 bg-black/20"
                        controls
                        src={adminApi.auctionMediaUrl(auction._id, asset._id)}
                      />
                    ) : (
                      <img
                        key={asset._id}
                        alt={auction.itemName}
                        className="w-full rounded-3xl border border-white/10 object-cover"
                        src={adminApi.auctionMediaUrl(auction._id, asset._id)}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-sand-100/55">{t('no_media')}</div>
              )}
            </Panel>

            <DataTable
              empty={t('no_bids_yet')}
              rows={selectedAuction.bids || []}
              columns={[
                { key: 'bidder', label: t('bidder_label'), render: (row) => person(row.bidder, t('not_available')) },
                { key: 'amount', label: t('amount_label'), render: (row) => currency(row.amount) },
                { key: 'time', label: t('placed_at_label'), render: (row) => new Date(row.createdAt).toLocaleString() },
              ]}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-sand-100/55">
            {t('pick_auction')}
          </div>
        )}
      </Panel>
    </div>
  );
}
