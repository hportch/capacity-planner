import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ALL_BANK_HOLIDAYS } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isWeekend(date: string): boolean {
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function isBankHoliday(date: string): boolean {
  return ALL_BANK_HOLIDAYS.has(date);
}

export function isWorkingDay(date: string): boolean {
  return !isWeekend(date) && !isBankHoliday(date);
}

export function getWorkingDays(from: string, to: string): string[] {
  const days: string[] = [];
  const current = new Date(from + 'T12:00:00Z');
  const end = new Date(to + 'T12:00:00Z');
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (isWorkingDay(dateStr)) {
      days.push(dateStr);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const from = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const to = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function getMonthName(month: number): string {
  return new Date(2026, month - 1).toLocaleDateString('en-GB', { month: 'short' });
}
