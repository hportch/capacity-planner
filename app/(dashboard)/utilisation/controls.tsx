'use client';

import { useRouter, usePathname } from 'next/navigation';

const YEARS = [2024, 2025, 2026] as const;
const GRANULARITIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
] as const;

interface UtilisationControlsProps {
  year: number;
  granularity: 'monthly' | 'quarterly' | 'annual';
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
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            onClick={() => navigate(year, g.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              granularity === g.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
