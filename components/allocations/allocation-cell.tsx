'use client';

import * as React from 'react';
import type { Status } from '@/lib/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquareTextIcon } from 'lucide-react';

interface AllocationCellProps {
  staffId: number;
  date: string;
  statusId: number | null;
  notes: string;
  statuses: Status[];
  disabled?: boolean;
  onChange: (staffId: number, date: string, statusId: number | null) => void;
  onNoteChange: (staffId: number, date: string, notes: string) => void;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
}

const statusesByCategory = (statuses: Status[]) => {
  const groups: Record<string, Status[]> = {
    available: [],
    partial: [],
    unavailable: [],
    loaned: [],
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
  loaned: 'Loaned',
};

export function AllocationCell({
  staffId,
  date,
  statusId,
  notes,
  statuses,
  disabled = false,
  onChange,
  onNoteChange,
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
        className="h-10 w-full rounded-sm bg-muted/50"
        title="Non-working day"
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-10 w-full min-w-[90px] max-w-[120px] flex-col items-start justify-center rounded-sm px-1.5 text-left text-xs font-semibold transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              backgroundColor: bgColor,
              color: textColor,
              textShadow: currentStatus
                ? textColor === '#ffffff'
                  ? '0 1px 2px rgba(0,0,0,0.3)'
                  : '0 1px 2px rgba(255,255,255,0.3)'
                : undefined,
            }}
          />
        }
      >
        <span className="truncate max-w-full leading-tight">
          {currentStatus?.name ?? '-'}
        </span>
        {notes && (
          <span
            className="flex items-center gap-0.5 truncate max-w-full text-[9px] font-normal leading-tight opacity-80"
            style={{ textShadow: 'none' }}
          >
            <MessageSquareTextIcon className="size-2 shrink-0" />
            {notes}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-2">
        <div className="flex flex-col gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={statusId?.toString() ?? ''}
              onValueChange={(val: string | null) => {
                const newId = val ? Number(val) : null;
                onChange(staffId, date, newId);
              }}
            >
              <SelectTrigger size="sm" className="mt-1 w-full">
                <span data-slot="select-value" className="flex flex-1 text-left">
                  {currentStatus?.name ?? 'Select status'}
                </span>
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
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Detail</Label>
            <Input
              className="mt-1 h-7 text-xs"
              placeholder="e.g. DWP project, covering for..."
              value={notes}
              onChange={(e) => onNoteChange(staffId, date, e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
