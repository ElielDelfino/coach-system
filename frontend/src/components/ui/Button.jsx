import clsx from 'clsx';

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-display font-bold uppercase tracking-wide transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand hover:bg-brand-light text-[#0A0A0E] glow-magenta-sm',
    secondary: 'bg-surface-elevated hover:bg-surface-pop text-white border border-white/10',
    accent: 'bg-transparent text-accent border border-accent/30 hover:border-accent/60',
    ghost: 'text-zinc-400 hover:text-white hover:bg-surface-elevated',
    danger: 'bg-danger/15 hover:bg-danger/25 text-danger border border-danger/40',
    outline: 'bg-transparent border border-white/10 text-white hover:bg-surface-elevated',
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
