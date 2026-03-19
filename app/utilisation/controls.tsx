'use client';

import { useRouter, usePathname } from 'next/navigation';

const YEARS = [2024, 2025, 2026] as const;

interface UtilisationControlsProps {
  year: number;
  granularity: 'monthly' | 'quarterly';
}

export function UtilisationControls({
  year,
  granularity,
}: UtilisationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(newYear: number, newGranularity: string) {
    const params = new URLSearchParams();
    params.set('year', String(newYear));
    params.set('granularity', newGranularity);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year selector */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => navigate(y, granularity)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              y === year
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Granularity toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
        <button
          onClick={() => navigate(year, 'monthly')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            granularity === 'monthly'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => navigate(year, 'quarterly')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            granularity === 'quarterly'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Quarterly
        </button>
      </div>
    </div>
  );
}
