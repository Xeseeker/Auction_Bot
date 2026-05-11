import { useState } from 'react';
import { useLocale } from '../lib/useLocale.js';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  reasonLabel,
  reasonPlaceholder,
  requireReason = false,
  onCancel,
  onConfirm,
}) {
  const { t } = useLocale();
  const [reason, setReason] = useState('');

  if (!open) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();
    if (requireReason && !reason.trim()) {
      return;
    }

    onConfirm(reason.trim());
    setReason('');
  };

  const close = () => {
    setReason('');
    onCancel();
  };

  const confirmClass = tone === 'danger' ? 'btn-danger h-10 px-4 py-2 text-xs' : 'btn-primary h-10 px-4 py-2 text-xs';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-sm">
      <form className="glass-panel w-full max-w-md p-5" onSubmit={submit}>
        <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
        {message ? <p className="mt-2 text-sm leading-6 text-sand-100/60">{message}</p> : null}

        {reasonLabel ? (
          <label className="mt-5 block">
            <span className="text-xs uppercase tracking-[0.18em] text-sand-100/45">{reasonLabel}</span>
            <textarea
              className="field mt-2 min-h-24 resize-y"
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder}
              value={reason}
            />
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="btn-secondary h-10 px-4 py-2 text-xs" onClick={close} type="button">
            {t('cancel')}
          </button>
          <button className={confirmClass} disabled={requireReason && !reason.trim()} type="submit">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
