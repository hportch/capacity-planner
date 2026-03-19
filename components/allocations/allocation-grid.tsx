'use client';

import * as React from 'react';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Status,
  StaffWithDetails,
  DailyAllocationWithDetails,
  Team,
} from '@/lib/types';
import { cn, isWeekend, isBankHoliday } from '@/lib/utils';
import { AllocationCell } from './allocation-cell';
import { Button } from '@/components/ui/button';
import { SaveIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react';

interface AllocationGridProps {
  staff: StaffWithDetails[];
  statuses: Status[];
  teams: Team[];
  initialAllocations: DailyAllocationWithDetails[];
  dateRange: { from: string; to: string };
  thresholds?: Record<number, number>; // team_id -> min_utilisation
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
  thresholds = {},
}: AllocationGridProps) {
  const router = useRouter();

  // Build initial maps from existing allocations (baselines for change tracking)
  const [initialStatusMap, setInitialStatusMap] = useState<Map<CellKey, number>>(() => {
    const map = new Map<CellKey, number>();
    for (const alloc of initialAllocations) {
      map.set(cellKey(alloc.staff_id, alloc.date), alloc.status_id);
    }
    return map;
  });

  const [initialNotesMap, setInitialNotesMap] = useState<Map<CellKey, string>>(() => {
    const map = new Map<CellKey, string>();
    for (const alloc of initialAllocations) {
      if (alloc.notes) {
        map.set(cellKey(alloc.staff_id, alloc.date), alloc.notes);
      }
    }
    return map;
  });

  // Current cell values
  const [cellValues, setCellValues] = useState<Map<CellKey, number>>(
    () => new Map(initialStatusMap)
  );
  const [cellNotes, setCellNotes] = useState<Map<CellKey, string>>(
    () => new Map(initialNotesMap)
  );

  // Track which cells have been changed (either status or notes)
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

  // Build a status weight lookup
  const statusWeightMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of statuses) {
      map.set(s.id, s.availability_weight);
    }
    return map;
  }, [statuses]);

  // Compute live utilisation per team from current cell values
  // Uses FTE-weighted headcount so part-time staff count proportionally
  const FULL_TIME_HOURS = 37.5;
  const teamUtilisation = useMemo(() => {
    const result = new Map<number, number>();
    const workingDates = allDates.filter(
      (d) => !isWeekend(d) && !isBankHoliday(d)
    );
    if (workingDates.length === 0) return result;

    for (const group of staffGroups) {
      let totalWeight = 0;
      let totalSlots = 0;
      for (const date of workingDates) {
        for (const member of group.members) {
          const fte = (member.contracted_hours ?? FULL_TIME_HOURS) / FULL_TIME_HOURS;
          const key = cellKey(member.id, date);
          const statusId = cellValues.get(key);
          const weight =
            statusId != null ? (statusWeightMap.get(statusId) ?? 1.0) : 1.0;
          totalWeight += weight * fte;
          totalSlots += fte;
        }
      }
      result.set(
        group.team.id,
        totalSlots > 0 ? totalWeight / totalSlots : 0
      );
    }
    return result;
  }, [staffGroups, allDates, cellValues, statusWeightMap]);

  // Check if a cell differs from its initial values
  const updateChangedState = useCallback(
    (key: CellKey, newStatus: number | undefined, newNote: string | undefined) => {
      setChangedCells((prev) => {
        const next = new Set(prev);
        const origStatus = initialStatusMap.get(key);
        const origNote = initialNotesMap.get(key) ?? '';
        const statusMatch = newStatus === origStatus || (newStatus === undefined && origStatus === undefined);
        const noteMatch = (newNote ?? '') === origNote;
        if (statusMatch && noteMatch) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      setSaveMessage(null);
    },
    [initialStatusMap, initialNotesMap]
  );

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
      // Use functional update to get latest cellNotes
      setCellNotes((currentNotes) => {
        const noteVal = currentNotes.get(key);
        updateChangedState(key, statusId ?? undefined, noteVal);
        return currentNotes;
      });
    },
    [updateChangedState]
  );

  const handleNoteChange = useCallback(
    (staffId: number, date: string, note: string) => {
      const key = cellKey(staffId, date);
      setCellNotes((prev) => {
        const next = new Map(prev);
        if (note) {
          next.set(key, note);
        } else {
          next.delete(key);
        }
        return next;
      });
      // Use functional update to get latest cellValues
      setCellValues((currentValues) => {
        const statusVal = currentValues.get(key);
        updateChangedState(key, statusVal, note || undefined);
        return currentValues;
      });
    },
    [updateChangedState]
  );

  const handleSave = useCallback(() => {
    if (changedCells.size === 0) return;

    startSaveTransition(async () => {
      const allocations = Array.from(changedCells).map((key) => {
        const [staffIdStr, date] = key.split('_') as [string, string];
        const statusId = cellValues.get(key);
        const notes = cellNotes.get(key) || null;
        return {
          staff_id: Number(staffIdStr),
          date,
          status_id: statusId!,
          notes,
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
        // Update baselines so change tracking stays accurate after save
        setInitialStatusMap(new Map(cellValues));
        setInitialNotesMap(new Map(cellNotes));
        setChangedCells(new Set());
        // Refresh server data to keep in sync
        router.refresh();
      } catch {
        setSaveMessage('Error: Network request failed');
      }
    });
  }, [changedCells, cellValues, cellNotes, router]);

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
                {(() => {
                  const util = teamUtilisation.get(group.team.id) ?? 0;
                  const utilPct = Math.round(util * 100);
                  const minThreshold = thresholds[group.team.id];
                  const belowThreshold = minThreshold != null && util < minThreshold;
                  return (
                    <tr className="border-b bg-muted/30">
                      <td
                        colSpan={allDates.length + 1}
                        className={cn(
                          'sticky left-0 z-10 border-l-[3px] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                          belowThreshold ? 'border-l-red-500' : 'border-l-teal-500'
                        )}
                      >
                        {group.team.name}
                        <span className="ml-2 font-normal normal-case">
                          ({group.members.length} staff)
                        </span>
                        <span
                          className={cn(
                            'ml-3 font-mono font-bold normal-case',
                            belowThreshold ? 'text-red-400' : 'text-teal-400'
                          )}
                        >
                          {utilPct}%
                        </span>
                        {belowThreshold && (
                          <span className="ml-1.5 inline-flex items-center gap-1 font-normal normal-case text-red-400">
                            <AlertTriangleIcon className="size-3" />
                            Below {Math.round(minThreshold * 100)}% threshold
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })()}
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
                      const currentNotes = cellNotes.get(key) ?? '';
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
                            notes={currentNotes}
                            statuses={statuses}
                            disabled={isNonWorking}
                            onChange={handleCellChange}
                            onNoteChange={handleNoteChange}
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
