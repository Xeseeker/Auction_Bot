import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';
import { DataTable } from '../components/DataTable.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useLocale } from '../lib/i18n.jsx';

const currency = (value) => `${Number(value || 0).toLocaleString()} ETB`;
const person = (user, fallback = 'N/A') => (user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fallback);

export function DashboardPage({ data, loading, error, onRefresh }) {
  const { t } = useLocale();
  const trendRows = data?.trends.auctions.labels.map((label, index) => ({
    day: label.slice(5),
    auctions: data.trends.auctions.data[index],
    bids: data.trends.bids.data[index],
  })) || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-tide-300">{t('dashboard_tag')}</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">{t('dashboard_title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">
            {t('dashboard_subtitle')}
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          {t('refresh')}
        </button>
      </header>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label={t('users_card')} value={loading ? '...' : data?.overview.totalUsers ?? 0} />
        <StatCard label={t('pending_sellers_card')} tone="warm" value={loading ? '...' : data?.overview.pendingSellerApprovals ?? 0} />
        <StatCard label={t('pending_auctions_card')} tone="warm" value={loading ? '...' : data?.overview.pendingAuctions ?? 0} />
        <StatCard label={t('active_auctions_card')} tone="success" value={loading ? '...' : data?.overview.activeAuctions ?? 0} />
        <StatCard label={t('total_bids_card')} tone="warm" value={loading ? '...' : data?.overview.totalBids ?? 0} />
        <StatCard label={t('volume_card')} tone="danger" value={loading ? '...' : currency(data?.overview.totalVolume)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={t('new_auctions_title')} subtitle={t('new_auctions_subtitle')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendRows}>
                <defs>
                  <linearGradient id="auctionsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3cbeb7" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#3cbeb7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(251,246,238,0.45)" />
                <YAxis stroke="rgba(251,246,238,0.45)" />
                <Tooltip contentStyle={{ background: '#121a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }} />
                <Area dataKey="auctions" stroke="#75d7d0" fill="url(#auctionsFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={t('bids_placed_title')} subtitle={t('bids_placed_subtitle')}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendRows}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(251,246,238,0.45)" />
                <YAxis stroke="rgba(251,246,238,0.45)" />
                <Tooltip contentStyle={{ background: '#121a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }} />
                <Bar dataKey="bids" fill="#ff7a45" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={t('recent_auctions_title')}>
          <DataTable
            rows={data?.recentAuctions || []}
            columns={[
              { key: 'item', label: t('item_label'), render: (row) => row.itemName },
              { key: 'seller', label: t('seller_label'), render: (row) => person(row.seller, t('not_available')) },
              { key: 'status', label: t('status_label'), render: (row) => <StatusBadge value={row.status} /> },
              { key: 'bid', label: t('current_bid_label'), render: (row) => currency(row.currentBid) },
            ]}
          />
        </Panel>

        <Panel title={t('recent_bids_title')}>
          <DataTable
            rows={data?.recentBids || []}
            columns={[
              { key: 'auction', label: t('auction_label'), render: (row) => row.auction?.itemName || t('not_available') },
              { key: 'bidder', label: t('bidder_label'), render: (row) => person(row.bidder, t('not_available')) },
              { key: 'amount', label: t('amount_label'), render: (row) => currency(row.amount) },
              { key: 'time', label: t('time_label'), render: (row) => new Date(row.createdAt).toLocaleString() },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
