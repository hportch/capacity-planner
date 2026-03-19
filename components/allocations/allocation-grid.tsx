'use client';

import * as React from 'react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import type {
  Status,
  StaffWithDetails,
  DailyAllocationWithDetails,
  Team,
} from '@/lib/types';
import { cn, isWeekend, isBankHoliday } from '@/lib/utils';
import { AllocationCell } from './allocation-cell';
import { Button } from '@/components/ui/button';
import { SaveIcon, Loader2Icon } from 'lucide-react';

interface AllocationGridProps {
  staff: StaffWithDetails[];
  statuses: Status[];
  teams: Team[];
  initialAllocations: DailyAllocationWithDetails[];
  dateRange: { from: string; to: string };
}

type CellKey = `${number}_${string}`;

function cellKey(staffId: number, date: string): CellKey {
  return `${staffId}_${date}`;
}

function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatColumnHeader(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const date = d.getDate().toString();
  return { day, date };
}

interface StaffGroup {
  team: Team;
  members: StaffWithDetails[];
}

export function AllocationGrid({
  staff,
  statuses,
  teams,
  initialAllocations,
  dateRange,
}: AllocationGridProps) {
  // Build initial status map from existing allocations
  const initialStatusMap = useMemo(() => {
    const map = new Map<CellKey, number>();
    for (const alloc of initialAllocations) {
      map.set(cellKey(alloc.staff_id, alloc.date), alloc.status_id);
    }
    return map;
  }, [initialAllocations]);

  // Current cell values (statusId per cell)
  const [cellValues, setCellValues] = useState<Map<CellKey, number>>(
    () => new Map(initialStatusMap)
  );

  // Track which cells have been changed
  const [changedCells, setChangedCells] = useState<Set<CellKey>>(
    () => new Set()
  );

  const [isSaving, startSaveTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // All dates in the range (including weekends for display)
  const allDates = useMemo(
    () => getDatesInRange(dateRange.from, dateRange.to),
    [dateRange]
  );

  // Group staff by team
  const staffGroups = useMemo(() => {
    const teamMap = new Map<number, StaffGroup>();
    for (const team of teams) {
      teamMap.set(team.id, { team, members: [] });
    }
    for (const member of staff) {
      const group = teamMap.get(member.team_id);
      if (group) {
        group.members.push(member);
      }
    }
    return Array.from(teamMap.values()).filter((g) => g.members.length > 0);
  }, [staff, teams]);

  const handleCellChange = useCallback(
    (staffId: number, date: string, statusId: number | null) => {
      const key = cellKey(staffId, date);
      setCellValues((prev) => {
        const next = new Map(prev);
        if (statusId === null) {
          next.delete(key);
        } else {
          next.set(key, statusId);
        }
        return next;
      });
      setChangedCells((prev) => {
        const next = new Set(prev);
        // Check if value matches original
        const originalValue = initialStatusMap.get(key);
        if (statusId === originalValue || (statusId === null && originalValue === undefined)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      setSaveMessage(null);
    },
    [initialStatusMap]
  );

  const handleSave = useCallback(() => {
    if (changedCells.size === 0) return;

    startSaveTransition(async () => {
      const allocations = Array.from(changedCells).map((key) => {
        const [staffIdStr, date] = key.split('_') as [string, string];
        const statusId = cellValues.get(key);
        return {
          staff_id: Number(staffIdStr),
          date,
          status_id: statusId!,
        };
      }).filter((a) => a.status_id != null);

      try {
        const res = await fetch('/api/allocations/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allocations }),
        });

        if (!res.ok) {
          const err = await res.json();
          setSaveMessage(`Error: ${err.error || 'Failed to save'}`);
          return;
        }

        const result = await res.json();
        setSaveMessage(`Saved ${result.count} allocation${result.count !== 1 ? 's' : ''}`);
        setChangedCells(new Set());
      } catch {
        setSaveMessage('Error: Network request failed');
      }
    });
  }, [changedCells, cellValues]);

  const hasChanges = changedCells.size > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Save bar */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
        >
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
          ) : (
            <SaveIcon className="size-4" data-icon="inline-start" />
          )}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        {hasChanges && (
          <span className="text-xs text-muted-foreground">
            {changedCells.size} unsaved change{changedCells.size !== 1 ? 's' : ''}
          </span>
        )}
        {saveMessage && (
          <span
            className={cn(
              'text-xs',
              saveMessage.startsWith('Error')
                ? 'text-destructive'
                : 'text-green-500'
            )}
          >
            {saveMessage}
          </span>
        )}
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-20 min-w-[160px] bg-muted/50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Staff
              </th>
              {allDates.map((date) => {
                const isNonWorking = isWeekend(date) || isBankHoliday(date);
                const { day, date: dateNum } = formatColumnHeader(date);
                return (
                  <th
                    key={date}
                    className={cn(
                      'min-w-[100px] px-1 py-2 text-center text-xs font-medium',
                      isNonWorking && 'bg-muted/80 text-muted-foreground/60'
                    )}
                  >
                    <div>{day}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {dateNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {staffGroups.map((group) => (
              <React.Fragment key={group.team.id}>
                {/* Team header row */}
                <tr className="border-b bg-muted/30">
                  <td
                    colSpan={allDates.length + 1}
                    className="sticky left-0 z-10 border-l-[3px] border-l-teal-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {group.team.name}
                    <span className="ml-2 font-normal normal-case">
                      ({group.members.length} staff)
                    </span>
                  </td>
                </tr>
                {/* Staff rows */}
                {group.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b transition-colors hover:bg-muted/20"
                  >
                    <td className="sticky left-0 z-10 bg-background px-3 py-1 text-sm font-medium">
                      <div className="truncate max-w-[150px]" title={member.name}>
                        {member.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {member.role_name}
                      </div>
                    </td>
                    {allDates.map((date) => {
                      const isNonWorking =
                        isWeekend(date) || isBankHoliday(date);
                      const key = cellKey(member.id, date);
                      const currentStatusId = cellValues.get(key) ?? null;
                      const isChanged = changedCells.has(key);

                      return (
                        <td
                          key={date}
                          className={cn(
                            'px-0.5 py-0.5',
                            isNonWorking && 'bg-muted/40',
                            isChanged && 'ring-2 ring-inset ring-teal-500/50'
                          )}
                        >
                          <AllocationCell
                            staffId={member.id}
                            date={date}
                            statusId={currentStatusId}
                            statuses={statuses}
                            disabled={isNonWorking}
                            onChange={handleCellChange}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
