import { createContext, useCallback, useContext, useState } from 'react';
import clsx from 'clsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const api = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'px-4 py-3 rounded-md border text-sm font-medium shadow-lg backdrop-blur',
              t.type === 'error' && 'bg-red-950/90 border-red-900 text-red-200',
              t.type === 'success' && 'bg-green-950/90 border-green-900 text-green-200',
              t.type === 'info' && 'bg-surface-elevated/95 border-surface-border text-white'
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}

export function errorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Erro desconhecido.';
}
