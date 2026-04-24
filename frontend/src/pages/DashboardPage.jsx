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

const currency = (value) => `${Number(value || 0).toLocaleString()} ETB`;
const person = (user) => (user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A');

export function DashboardPage({ data, loading, error, onRefresh }) {
  const trendRows = data?.trends.auctions.labels.map((label, index) => ({
    day: label.slice(5),
    auctions: data.trends.auctions.data[index],
    bids: data.trends.bids.data[index],
  })) || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Overview</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Platform dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">
            Real-time operations view for auction flow, bidding pressure, and trust & safety.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh data
        </button>
      </header>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={loading ? '...' : data?.overview.totalUsers ?? 0} />
        <StatCard label="Active auctions" tone="success" value={loading ? '...' : data?.overview.activeAuctions ?? 0} />
        <StatCard label="Total bids" tone="warm" value={loading ? '...' : data?.overview.totalBids ?? 0} />
        <StatCard label="Auction volume" tone="danger" value={loading ? '...' : currency(data?.overview.totalVolume)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="New auctions" subtitle="Created during the last 7 days">
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

        <Panel title="Bids placed" subtitle="Last 7 days of bidding activity">
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
        <Panel title="Recent auctions">
          <DataTable
            rows={data?.recentAuctions || []}
            columns={[
              { key: 'item', label: 'Item', render: (row) => row.itemName },
              { key: 'seller', label: 'Seller', render: (row) => person(row.seller) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
              { key: 'bid', label: 'Current bid', render: (row) => currency(row.currentBid) },
            ]}
          />
        </Panel>

        <Panel title="Recent bids">
          <DataTable
            rows={data?.recentBids || []}
            columns={[
              { key: 'auction', label: 'Auction', render: (row) => row.auction?.itemName || 'N/A' },
              { key: 'bidder', label: 'Bidder', render: (row) => person(row.bidder) },
              { key: 'amount', label: 'Amount', render: (row) => currency(row.amount) },
              { key: 'time', label: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
