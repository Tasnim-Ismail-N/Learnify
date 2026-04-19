import { cn, getInitials, hashToColor } from '../../lib/utils';

interface AvatarProps {
  username: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };

export function Avatar({ username, size = 'md', className }: AvatarProps) {
  const initials = getInitials(username);
  const color = hashToColor(username);

  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', sizes[size], className)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
