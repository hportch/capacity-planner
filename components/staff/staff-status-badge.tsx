import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StaffStatusBadgeProps {
  isActive: number;
  isVacancy?: number;
  className?: string;
}

export function StaffStatusBadge({ isActive, isVacancy, className }: StaffStatusBadgeProps) {
  if (isVacancy) {
    return (
      <Badge
        className={cn(
          'bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
          className
        )}
      >
        Vacancy
      </Badge>
    );
  }

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
