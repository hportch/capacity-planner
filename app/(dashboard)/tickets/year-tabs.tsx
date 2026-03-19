'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface YearTabsProps {
  years: number[];
  selectedYear: number;
}

export function YearTabs({ years, selectedYear }: YearTabsProps) {
  return (
    <div className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
      {years.map((year) => (
        <Link
          key={year}
          href={`/tickets?year=${year}`}
          className={cn(
            'inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 text-sm font-medium transition-all',
            year === selectedYear
              ? 'bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30'
              : 'text-foreground/60 hover:text-foreground'
          )}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}
