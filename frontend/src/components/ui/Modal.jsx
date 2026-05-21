import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'md:max-w-md',
    md: 'md:max-w-xl',
    lg: 'md:max-w-3xl',
    xl: 'md:max-w-5xl',
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/70 md:backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full bg-surface-card border-t md:border border-surface-border rounded-t-2xl md:rounded-lg shadow-2xl max-h-[100dvh] md:max-h-[90vh] flex flex-col ${sizes[size]}`}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {title && (
          <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
            <h2 className="text-page-title text-base">{title}</h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white text-2xl leading-none min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-surface-border flex items-center justify-end gap-2 flex-wrap bg-surface-card shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
