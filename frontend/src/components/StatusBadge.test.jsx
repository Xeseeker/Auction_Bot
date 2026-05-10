import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

describe('StatusBadge', () => {
  it('renders translated known statuses', () => {
    renderWithLocale(<StatusBadge value="active" />);

    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('falls back to a readable unknown status label', () => {
    renderWithLocale(<StatusBadge value="custom_status" />);

    expect(screen.getByText('custom status')).toBeInTheDocument();
  });
});
