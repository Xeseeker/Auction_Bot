import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaginationControls } from './PaginationControls.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

describe('PaginationControls', () => {
  it('renders page range and changes pages', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    renderWithLocale(
      <PaginationControls onPageChange={onPageChange} pagination={{ page: 2, pages: 3, total: 45, limit: 20 }} />
    );

    expect(screen.getByText('Showing 21-40 of 45')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('does not render for a single page', () => {
    const { container } = renderWithLocale(
      <PaginationControls onPageChange={vi.fn()} pagination={{ page: 1, pages: 1, total: 2, limit: 20 }} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
