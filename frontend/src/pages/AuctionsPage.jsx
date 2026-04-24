import { useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable.jsx';
import { Panel } from '../components/Panel.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

const currency = (value) => `${Number(value || 0).toLocaleString()} ETB`;
const person = (user) => (user?.username ? `@${user.username}` : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A');

export function AuctionsPage({
  auctions,
  selectedAuction,
  loading,
  detailLoading,
  error,
  onSearch,
  onSelect,
  onCancel,
}) {
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const querySummary = useMemo(
    () => (filters.search ? `Search: ${filters.search}` : filters.status === 'all' ? 'All auctions' : `Status: ${filters.status}`),
    [filters]
  );

  const submit = (event) => {
    event.preventDefault();
    onSearch(filters);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-tide-300">Moderation</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-white">Auction management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sand-100/60">
          Audit listings, inspect bid trails, and cancel auctions that violate policy or platform rules.
        </p>
      </header>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <Panel
        title="Auction directory"
        subtitle={querySummary}
        actions={
          <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_auto]" onSubmit={submit}>
            <input
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search item or description"
              value={filters.search}
            />
            <select
              className="field"
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              value={filters.status}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </form>
        }
      >
        <DataTable
          rows={auctions}
          columns={[
            {
              key: 'item',
              label: 'Item',
              render: (row) => (
                <button className="text-left font-semibold text-tide-300 hover:text-tide-200" onClick={() => onSelect(row._id)} type="button">
                  {row.itemName}
                </button>
              ),
            },
            { key: 'seller', label: 'Seller', render: (row) => person(row.seller) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
            { key: 'bid', label: 'Current bid', render: (row) => currency(row.currentBid) },
            { key: 'ends', label: 'Ends', render: (row) => new Date(row.endTime).toLocaleString() },
          ]}
        />
      </Panel>

      <Panel
        title="Auction detail"
        subtitle={selectedAuction ? selectedAuction.auction.description : 'Select an auction to inspect its moderation context and bid history.'}
        actions={
          selectedAuction?.auction.status === 'active' ? (
            <button
              className="btn-danger"
              onClick={() => {
                const reason = window.prompt('Optional reason for cancelling this auction:') || '';
                onCancel(selectedAuction.auction._id, reason);
              }}
              type="button"
            >
              Cancel auction
            </button>
          ) : null
        }
      >
        {detailLoading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-sand-100/55">
            Loading auction detail...
          </div>
        ) : selectedAuction ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">Status</p>
                <div className="mt-3"><StatusBadge value={selectedAuction.auction.status} /></div>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">Seller</p>
                <p className="mt-3 font-semibold text-white">{person(selectedAuction.auction.seller)}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">Highest bidder</p>
                <p className="mt-3 font-semibold text-white">{person(selectedAuction.auction.highestBidder)}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sand-100/45">Current bid</p>
                <p className="mt-3 font-semibold text-white">{currency(selectedAuction.auction.currentBid)}</p>
              </div>
            </div>

            <DataTable
              empty="This auction has no bids yet."
              rows={selectedAuction.bids || []}
              columns={[
                { key: 'bidder', label: 'Bidder', render: (row) => person(row.bidder) },
                { key: 'amount', label: 'Amount', render: (row) => currency(row.amount) },
                { key: 'time', label: 'Placed at', render: (row) => new Date(row.createdAt).toLocaleString() },
              ]}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-sand-100/55">
            Pick an auction from the table above to load its bid history and moderation tools.
          </div>
        )}
      </Panel>
    </div>
  );
}
