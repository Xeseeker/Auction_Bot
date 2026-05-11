import { useLocale } from '../lib/useLocale.js';

export function PaginationControls({ pagination, loading = false, onPageChange }) {
  const { t } = useLocale();

  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  const { page, pages, total, limit } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-sand-100/60 sm:flex-row sm:items-center sm:justify-between">
      <p>
        {t('pagination_summary', {
          start: String(start),
          end: String(end),
          total: String(total),
        })}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary h-9 px-4 py-2 text-xs"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          {t('previous')}
        </button>
        <span className="min-w-20 text-center text-xs font-semibold uppercase tracking-[0.18em] text-sand-100/45">
          {page} / {pages}
        </span>
        <button
          className="btn-secondary h-9 px-4 py-2 text-xs"
          disabled={loading || page >= pages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
