import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataTable } from '../components/DataTable.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

const currency = (value) => `${Number(value || 0).toLocaleString()} ETB`;
const person = (user) => (user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A');

const pieColors = ['#3cbeb7', '#2fb87f', '#ff7a45', '#f45b69', '#75d7d0'];

export function StatsPage({ data, loading, error, onRefresh }) {
  const sellerRows =
    data?.topSellers.map((row) => ({
      name: person(row.seller),
      auctions: row.auctionsCreated,
    })) || [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Reporting</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Detailed statistics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">
            Understand which sellers, bidders, and auction states are driving platform activity.
          </p>
        </div>
        <button className="btn-secondary" onClick={onRefresh} type="button">
          Refresh data
        </button>
      </header>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Auction status mix" subtitle="Current auction distribution by state">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.statusBreakdown || []} dataKey="count" nameKey="_id" innerRadius={70} outerRadius={110} paddingAngle={4}>
                  {(data?.statusBreakdown || []).map((entry, index) => (
                    <Cell key={entry._id} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#121a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {(data?.statusBreakdown || []).map((entry) => (
              <div key={entry._id} className="rounded-full bg-white/5 px-4 py-2 text-sm text-sand-50">
                <span className="font-semibold">{entry.count}</span> {entry._id}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top sellers" subtitle="Auction volume by seller">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sellerRows} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" stroke="rgba(251,246,238,0.45)" />
                <YAxis dataKey="name" type="category" width={110} stroke="rgba(251,246,238,0.45)" />
                <Tooltip contentStyle={{ background: '#121a28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }} />
                <Bar dataKey="auctions" fill="#3cbeb7" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Top bidders">
          <DataTable
            rows={loading ? [] : data?.topBidders || []}
            columns={[
              { key: 'bidder', label: 'Bidder', render: (row) => person(row.bidder) },
              { key: 'count', label: 'Bids placed', render: (row) => row.bidsPlaced },
              { key: 'maxBid', label: 'Max bid', render: (row) => currency(row.maxBid) },
            ]}
          />
        </Panel>

        <Panel title="Highest-value auctions">
          <DataTable
            rows={loading ? [] : data?.highestBids || []}
            columns={[
              { key: 'item', label: 'Auction', render: (row) => row.itemName },
              { key: 'winner', label: 'Winner', render: (row) => person(row.highestBidder) },
              { key: 'amount', label: 'Amount', render: (row) => currency(row.currentBid) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Latest bids">
        <DataTable
          rows={loading ? [] : data?.latestBids || []}
          columns={[
            { key: 'auction', label: 'Auction', render: (row) => row.auction?.itemName || 'N/A' },
            { key: 'bidder', label: 'Bidder', render: (row) => person(row.bidder) },
            { key: 'amount', label: 'Amount', render: (row) => currency(row.amount) },
            { key: 'time', label: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() },
          ]}
        />
      </Panel>
    </div>
  );
}
