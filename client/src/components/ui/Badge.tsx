import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

export function Badge({ variant = 'brand', className, children, ...props }: BadgeProps) {
  const variants = {
    brand: 'bg-brand-900 text-brand-300 border border-brand-700',
    success: 'bg-neon-teal/10 text-neon-teal border border-neon-teal/30',
    warning: 'bg-neon-amber/10 text-neon-amber border border-neon-amber/30',
    danger: 'bg-red-900/30 text-red-400 border border-red-800',
    neutral: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  };

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
