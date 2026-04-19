import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: 'brand' | 'teal' | 'amber' | 'red';
  label?: string;
  showPct?: boolean;
  animated?: boolean;
}

const colors = {
  brand: 'bg-brand-500',
  teal: 'bg-neon-teal',
  amber: 'bg-neon-amber',
  red: 'bg-red-500',
};

export function ProgressBar({ value, max = 100, className, color = 'brand', label, showPct = false, animated = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('space-y-1', className)}>
      {(label || showPct) && (
        <div className="flex justify-between items-center text-xs text-zinc-400">
          {label && <span>{label}</span>}
          {showPct && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        {animated ? (
          <motion.div
            className={cn('h-full rounded-full', colors[color])}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ) : (
          <div className={cn('h-full rounded-full', colors[color])} style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}
