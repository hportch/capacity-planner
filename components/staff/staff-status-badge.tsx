import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StaffStatusBadgeProps {
  isActive: number;
  className?: string;
}

export function StaffStatusBadge({ isActive, className }: StaffStatusBadgeProps) {
  return (
    <Badge
      className={cn(
        isActive
          ? 'bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400'
          : 'bg-zinc-500/15 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400',
        className
      )}
    >
      {isActive ? 'Active' : 'Archived'}
    </Badge>
  );
}
