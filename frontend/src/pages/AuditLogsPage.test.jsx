import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditLogsPage } from './AuditLogsPage.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

afterEach(() => cleanup());

describe('AuditLogsPage', () => {
  it('renders audit log rows', () => {
    renderWithLocale(
      <AuditLogsPage
        error=""
        loading={false}
        logs={[
          {
            _id: '1',
            createdAt: '2026-05-11T10:00:00.000Z',
            actor: 'admin',
            action: 'auction.approve',
            entityType: 'auction',
            reason: '',
          },
        ]}
        onPageChange={vi.fn()}
        onSearch={vi.fn()}
        pagination={null}
      />
    );

    expect(screen.getByRole('heading', { name: 'Audit logs' })).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('auction.approve')).toBeInTheDocument();
  });

  it('submits audit filters', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    renderWithLocale(
      <AuditLogsPage error="" loading={false} logs={[]} onPageChange={vi.fn()} onSearch={onSearch} pagination={null} />
    );

    await user.type(screen.getByPlaceholderText('Actor'), 'admin');
    await user.type(screen.getByPlaceholderText('Action'), 'user.ban');
    await user.selectOptions(screen.getByRole('combobox'), 'user');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSearch).toHaveBeenCalledWith({
      actor: 'admin',
      action: 'user.ban',
      entityType: 'user',
    });
  });
});
