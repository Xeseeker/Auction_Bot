import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable } from './DataTable.jsx';
import { LocaleProvider } from '../lib/i18n.jsx';

const renderWithLocale = (ui) => render(<LocaleProvider>{ui}</LocaleProvider>);

describe('DataTable', () => {
  it('renders the localized empty state', () => {
    renderWithLocale(<DataTable columns={[{ key: 'name', label: 'Name', render: (row) => row.name }]} rows={[]} />);

    expect(screen.getByText('No records found.')).toBeInTheDocument();
  });

  it('renders table headers and row cells', () => {
    renderWithLocale(
      <DataTable
        columns={[
          { key: 'name', label: 'Name', render: (row) => row.name },
          { key: 'status', label: 'Status', render: (row) => row.status },
        ]}
        rows={[{ _id: '1', name: 'Alice', status: 'active' }]}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
