'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface DateRangePickerProps {
  from: string;
  to: string;
  mode: 'week' | 'month';
}

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getFriday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 4);
  return d;
}

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatDisplayYear(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    year: 'numeric',
  });
}

export function DateRangePicker({ from, to, mode }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (newFrom: string, newTo: string, newMode: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('from', newFrom);
      params.set('to', newTo);
      params.set('mode', newMode);
      router.push(`/allocations?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePrev = useCallback(() => {
    if (mode === 'week') {
      const monday = getMonday(from);
      monday.setDate(monday.getDate() - 7);
      const friday = getFriday(monday);
      navigate(formatDateStr(monday), formatDateStr(friday), 'week');
    } else {
      const d = new Date(from + 'T00:00:00');
      d.setMonth(d.getMonth() - 1);
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      navigate(formatDateStr(firstDay), formatDateStr(lastDay), 'month');
    }
  }, [from, mode, navigate]);

  const handleNext = useCallback(() => {
    if (mode === 'week') {
      const monday = getMonday(from);
      monday.setDate(monday.getDate() + 7);
      const friday = getFriday(monday);
      navigate(formatDateStr(monday), formatDateStr(friday), 'week');
    } else {
      const d = new Date(from + 'T00:00:00');
      d.setMonth(d.getMonth() + 1);
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      navigate(formatDateStr(firstDay), formatDateStr(lastDay), 'month');
    }
  }, [from, mode, navigate]);

  const handleToggleMode = useCallback(() => {
    if (mode === 'week') {
      const d = new Date(from + 'T00:00:00');
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      navigate(formatDateStr(firstDay), formatDateStr(lastDay), 'month');
    } else {
      const monday = getMonday(from);
      const friday = getFriday(monday);
      navigate(formatDateStr(monday), formatDateStr(friday), 'week');
    }
  }, [from, mode, navigate]);

  const handleToday = useCallback(() => {
    const today = new Date();
    const todayStr = formatDateStr(today);
    if (mode === 'week') {
      const monday = getMonday(todayStr);
      const friday = getFriday(monday);
      navigate(formatDateStr(monday), formatDateStr(friday), 'week');
    } else {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      navigate(formatDateStr(firstDay), formatDateStr(lastDay), 'month');
    }
  }, [mode, navigate]);

  const displayRange = `${formatDisplayDate(from)} - ${formatDisplayDate(to)}, ${formatDisplayYear(to)}`;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleToday}>
        Today
      </Button>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handlePrev}
          aria-label="Previous"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-[180px] text-center text-sm font-medium">
          {displayRange}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNext}
          aria-label="Next"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={handleToggleMode}>
        {mode === 'week' ? 'Month' : 'Week'}
      </Button>
    </div>
  );
}
