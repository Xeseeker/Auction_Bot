import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuctionsPage } from './AuctionsPage.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

const auction = {
  _id: 'auction-1',
  itemName: 'Vintage camera',
  description: 'Clean listing',
  seller: { username: 'seller' },
  highestBidder: null,
  status: 'pending',
  auctionType: 'standard',
  category: 'Electronics',
  currentBid: 100,
  reservePrice: 0,
  buyNowPrice: 0,
  bidIncrement: 5,
  tags: ['camera'],
  endTime: '2026-05-12T10:00:00.000Z',
  mediaAssets: [],
};

afterEach(() => cleanup());

describe('AuctionsPage', () => {
  it('submits auction filters', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    renderWithLocale(
      <AuctionsPage
        auctions={[]}
        detailLoading={false}
        error=""
        loading={false}
        onApprove={vi.fn()}
        onCancel={vi.fn()}
        onPageChange={vi.fn()}
        onReject={vi.fn()}
        onSearch={onSearch}
        onSelect={vi.fn()}
        pagination={null}
        selectedAuction={null}
      />
    );

    await user.type(screen.getByPlaceholderText('Search item, category, or description'), 'camera');
    await user.selectOptions(screen.getByRole('combobox'), 'pending');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSearch).toHaveBeenCalledWith({ search: 'camera', status: 'pending' });
  });

  it('confirms rejecting a pending auction with a reason', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();

    renderWithLocale(
      <AuctionsPage
        auctions={[auction]}
        detailLoading={false}
        error=""
        loading={false}
        onApprove={vi.fn()}
        onCancel={vi.fn()}
        onPageChange={vi.fn()}
        onReject={onReject}
        onSearch={vi.fn()}
        onSelect={vi.fn()}
        pagination={null}
        selectedAuction={{ auction, bids: [] }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Reject auction' }));
    const dialog = screen.getByRole('heading', { name: 'Reject auction' }).closest('form');

    await user.type(within(dialog).getByPlaceholderText('Optional reason for rejecting this auction:'), 'Needs photos');
    await user.click(within(dialog).getByRole('button', { name: 'Reject auction' }));

    expect(onReject).toHaveBeenCalledWith('auction-1', 'Needs photos');
  });
});
