import clsx from 'clsx';

export function Card({ className = '', elevated = false, children, ...props }) {
  return (
    <div
      className={clsx(
        elevated ? 'bg-surface-elevated' : 'bg-surface-card',
        'bg-grad-surface border border-white/[0.07] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.55)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={clsx('px-5 py-4 border-b border-white/[0.07]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = '', children, ...props }) {
  return (
    <div className={clsx('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, hint, accent = false }) {
  return (
    <Card className={clsx('px-5 py-4', accent && 'border-brand/35 shadow-glow-magenta-sm')}>
      <div className="text-section-label">{label}</div>
      <div
        className={clsx(
          'text-3xl font-mono font-bold tabular-nums mt-2',
          accent ? 'text-brand text-glow-magenta' : 'text-white'
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs font-mono text-zinc-500 mt-1.5">{hint}</div>}
    </Card>
  );
}
