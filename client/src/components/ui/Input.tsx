import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-zinc-300">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg border bg-zinc-800 text-zinc-100 placeholder:text-zinc-500',
              'px-3 py-2.5 text-sm transition-colors',
              'border-zinc-700 hover:border-zinc-600',
              'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              icon ? 'pl-10' : '',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
