import { useLocale } from '../lib/i18n.jsx';

export function DataTable({ columns, rows, empty = 'No records found.' }) {
  const { t } = useLocale();
  const resolvedEmpty = empty === 'No records found.' ? t('no_records') : empty;

  if (!rows.length) {
    return <div className="table-wrap p-10 text-center text-sm text-sand-100/55">{resolvedEmpty}</div>;
  }

  return (
    <div className="table-wrap overflow-x-auto">
      <table className="min-w-full text-left">
        <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-sand-100/45">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row._id || index} className="border-t border-white/10">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4 align-top text-sm text-sand-50">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
