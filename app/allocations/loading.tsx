import { Skeleton } from '@/components/ui/skeleton';

export default function AllocationsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-40" />
        </div>
      </div>

      {/* Save bar skeleton */}
      <Skeleton className="h-8 w-36" />

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border">
        {/* Header */}
        <div className="flex border-b bg-muted/50 p-2 gap-2">
          <Skeleton className="h-6 w-40 shrink-0" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24 shrink-0" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 10 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex border-b p-2 gap-2">
            <Skeleton className="h-8 w-40 shrink-0" />
            {Array.from({ length: 5 }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-8 w-24 shrink-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
