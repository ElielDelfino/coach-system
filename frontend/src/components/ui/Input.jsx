import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        'w-full bg-surface-input border border-surface-border text-white placeholder:text-zinc-600',
        'rounded-md px-3 py-2 text-base md:text-sm transition-colors',
        'focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand',
        className
      )}
      {...props}
    />
  );
});

export default Input;
