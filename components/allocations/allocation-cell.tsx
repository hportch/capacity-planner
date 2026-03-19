'use client';

import * as React from 'react';
import type { Status } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AllocationCellProps {
  staffId: number;
  date: string;
  statusId: number | null;
  statuses: Status[];
  disabled?: boolean;
  onChange: (staffId: number, date: string, statusId: number | null) => void;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.45 ? '#000000' : '#ffffff';
}

const statusesByCategory = (statuses: Status[]) => {
  const groups: Record<string, Status[]> = {
    available: [],
    partial: [],
    unavailable: [],
  };
  for (const s of statuses) {
    if (groups[s.category]) {
      groups[s.category].push(s);
    }
  }
  return groups;
};

const categoryLabels: Record<string, string> = {
  available: 'Available',
  partial: 'Partial',
  unavailable: 'Unavailable',
};

export function AllocationCell({
  staffId,
  date,
  statusId,
  statuses,
  disabled = false,
  onChange,
}: AllocationCellProps) {
  const currentStatus = statusId
    ? statuses.find((s) => s.id === statusId)
    : null;

  const bgColor = currentStatus?.color || 'transparent';
  const textColor = currentStatus ? getContrastColor(currentStatus.color) : undefined;

  const grouped = React.useMemo(() => statusesByCategory(statuses), [statuses]);

  if (disabled) {
    return (
      <div
        className="h-8 w-full rounded-sm bg-muted/50"
        title="Non-working day"
      />
    );
  }

  return (
    <Select
      value={statusId?.toString() ?? ''}
      onValueChange={(val: string | null) => {
        const newId = val ? Number(val) : null;
        onChange(staffId, date, newId);
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-7 min-w-[90px] max-w-[120px] border-0 px-1.5 text-xs font-semibold transition-[filter] duration-150 hover:brightness-110"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          textShadow: currentStatus
            ? textColor === '#ffffff'
              ? '0 1px 2px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(255,255,255,0.3)'
            : undefined,
        }}
      >
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} side="bottom" sideOffset={2}>
        {Object.entries(grouped).map(([category, items]) => {
          if (items.length === 0) return null;
          return (
            <SelectGroup key={category}>
              <SelectLabel>{categoryLabels[category]}</SelectLabel>
              {items.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
