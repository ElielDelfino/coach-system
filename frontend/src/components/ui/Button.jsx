import clsx from 'clsx';

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand hover:bg-brand-dark text-white',
    secondary: 'bg-surface-elevated hover:bg-surface-border text-white border border-surface-border',
    ghost: 'text-zinc-400 hover:text-white hover:bg-surface-elevated',
    danger: 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-900',
    outline: 'bg-transparent border border-surface-border text-white hover:bg-surface-elevated',
  };

  const sizes = {
    sm: 'text-[10px] px-3 py-1.5 min-h-[36px]',
    md: 'text-xs px-4 py-2 min-h-[44px] md:min-h-[36px]',
    lg: 'text-sm px-6 py-3 min-h-[48px] md:min-h-[44px]',
  };

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
