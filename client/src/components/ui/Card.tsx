import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ glass, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 p-4',
        glass ? 'bg-zinc-900/60 backdrop-blur-sm' : 'bg-zinc-900',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
