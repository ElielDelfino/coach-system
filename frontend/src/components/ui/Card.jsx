import clsx from 'clsx';

export function Card({ className = '', elevated = false, children, ...props }) {
  return (
    <div
      className={clsx(
        elevated ? 'bg-surface-elevated' : 'bg-surface-card',
        'border border-surface-border rounded-lg',
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
    <div className={clsx('px-5 py-4 border-b border-surface-border', className)} {...props}>
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
    <Card className="px-5 py-4">
      <div className="text-section-label">{label}</div>
      <div className={clsx('text-3xl font-black mt-1', accent ? 'text-brand' : 'text-white')}>
        {value}
      </div>
      {hint && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
    </Card>
  );
}
