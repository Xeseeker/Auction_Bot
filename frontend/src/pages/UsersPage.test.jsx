import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

const users = [
  {
    _id: 'user-1',
    username: 'seller',
    telegramId: '123456',
    role: 'user',
    banned: false,
    sellerApproved: false,
    sellerApprovalStatus: 'pending',
    approvalRequestedAt: '2026-05-11T10:00:00.000Z',
    approvedBy: '',
    watchlist: [],
  },
];

afterEach(() => cleanup());

describe('UsersPage', () => {
  it('submits user filters', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    renderWithLocale(
      <UsersPage
        error=""
        loading={false}
        onApprovalReview={vi.fn()}
        onBanToggle={vi.fn()}
        onPageChange={vi.fn()}
        onSearch={onSearch}
        pagination={null}
        users={[]}
      />
    );

    await user.type(screen.getByPlaceholderText('Username, name, or Telegram ID'), 'seller');
    const [roleSelect, sellerApprovalSelect, accessSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(roleSelect, 'user');
    await user.selectOptions(sellerApprovalSelect, 'approved');
    await user.selectOptions(accessSelect, 'false');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSearch).toHaveBeenCalledWith({
      search: 'seller',
      role: 'user',
      sellerApproval: 'approved',
      banned: 'false',
    });
  });

  it('confirms a user ban with a reason', async () => {
    const user = userEvent.setup();
    const onBanToggle = vi.fn();

    renderWithLocale(
      <UsersPage
        error=""
        loading={false}
        onApprovalReview={vi.fn()}
        onBanToggle={onBanToggle}
        onPageChange={vi.fn()}
        onSearch={vi.fn()}
        pagination={null}
        users={users}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ban' }));
    const dialog = screen.getByRole('heading', { name: 'Ban' }).closest('form');

    await user.type(within(dialog).getByPlaceholderText('Optional ban reason:'), 'Spam bids');
    await user.click(within(dialog).getByRole('button', { name: 'Ban' }));

    expect(onBanToggle).toHaveBeenCalledWith('user-1', true, 'Spam bids');
  });
});
