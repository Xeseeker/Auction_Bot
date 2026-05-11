import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

describe('ConfirmDialog', () => {
  it('submits a typed reason', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    renderWithLocale(
      <ConfirmDialog
        confirmLabel="Reject"
        message="Reject this auction?"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open
        reasonLabel="Reason"
        title="Reject auction"
      />
    );

    await user.type(screen.getByLabelText('Reason'), 'Bad listing');
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onConfirm).toHaveBeenCalledWith('Bad listing');
  });

  it('does not render when closed', () => {
    const { container } = renderWithLocale(
      <ConfirmDialog confirmLabel="Confirm" onCancel={vi.fn()} onConfirm={vi.fn()} open={false} title="Hidden" />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
