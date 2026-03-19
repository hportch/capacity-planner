'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  StaffWithDetails,
  DailyAllocationWithDetails,
  Status,
  Team,
} from '@/lib/types';
import { cn, isWeekend, isBankHoliday } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

export interface GanttChartProps {
  staff: StaffWithDetails[];
  allocations: DailyAllocationWithDetails[];
  statuses: Status[];
  dateRange: { from: string; to: string };
  teams: Team[];
  teamIdFilter: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate an array of ISO date strings between `from` and `to` inclusive. */
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + 'T12:00:00');
  const end = new Date(to + 'T12:00:00');
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (dates.length === 0 || dates[dates.length - 1] !== dateStr) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** First letter of the 3-letter day-of-week abbreviation (UTC to avoid DST issues). */
function dayLetter(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
    .charAt(0);
}

/** Day-of-month number for display (UTC). */
function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDate();
}

/** Short month abbreviation for header grouping (UTC). */
function monthAbbr(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Short abbreviation for a status name (2-3 chars). */
function statusAbbr(name: string): string {
  const map: Record<string, string> = {
    'Normal Work': 'NW',
    'Service Desk': 'SD',
    SD: 'SD',
    Projects: 'Prj',
    VSOC: 'VS',
    DWP: 'DW',
    Argus: 'Arg',
    BaB: 'BaB',
    'On-site': 'OS',
    WFH: 'WFH',
    Office: 'Off',
    'Annual Leave': 'AL',
    Leave: 'Lv',
    'A/L': 'AL',
    'Half Day': 'HD',
    'Bank Holiday': 'BH',
    Sickness: 'Sk',
    'Sick Leave': 'Sk',
    'Compassionate Leave': 'CL',
    'Maternity Leave': 'ML',
    Training: 'Tr',
    Study: 'St',
    Revision: 'Rv',
    Exam: 'Ex',
    'On-Call': 'OC',
    Admin: 'Ad',
    Induction: 'In',
    Left: 'Lt',
  };
  return map[name] ?? name.slice(0, 2).toUpperCase();
}

/**
 * Choose white or dark text for best contrast on a hex background.
 * Uses a simplified relative-luminance check.
 */
function textColorForBg(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#1a1a1a' : '#ffffff';
}

/** Compute a month range given a year and 1-indexed month. */
function computeMonthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

const DEFAULT_COLOR = '#22c55e';
const DEFAULT_NAME = 'Normal Work';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GanttChart({
  staff,
  allocations,
  statuses,
  dateRange,
  teams,
  teamIdFilter,
}: GanttChartProps) {
  const router = useRouter();

  const dates = useMemo(
    () => generateDateRange(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to],
  );

  // Build a lookup: `staffId:date` -> allocation
  const allocationMap = useMemo(() => {
    const map = new Map<string, DailyAllocationWithDetails>();
    for (const a of allocations) {
      map.set(`${a.staff_id}:${a.date}`, a);
    }
    return map;
  }, [allocations]);

  // Find "Normal Work" status if it exists
  const normalWorkStatus = useMemo(
    () => statuses.find((s) => s.name === 'Normal Work'),
    [statuses],
  );

  // Group staff by team, ordered by team display_order
  const teamGroups = useMemo(() => {
    const groups: { team: Team; members: StaffWithDetails[] }[] = [];
    const sorted = [...teams].sort(
      (a, b) => a.display_order - b.display_order,
    );
    for (const team of sorted) {
      const members = staff.filter((s) => s.team_id === team.id);
      if (members.length > 0) {
        groups.push({ team, members });
      }
    }
    return groups;
  }, [staff, teams]);

  // Detect month boundaries for the multi-column month header
  const monthBoundaries = useMemo(() => {
    const boundaries: { startIdx: number; label: string; span: number }[] = [];
    let currentMonth = '';
    let startIdx = 0;
    for (let i = 0; i < dates.length; i++) {
      const m = dates[i].substring(0, 7);
      if (m !== currentMonth) {
        if (currentMonth !== '') {
          boundaries.push({
            startIdx,
            label: monthAbbr(dates[startIdx]),
            span: i - startIdx,
          });
        }
        currentMonth = m;
        startIdx = i;
      }
    }
    if (dates.length > 0) {
      boundaries.push({
        startIdx,
        label: monthAbbr(dates[startIdx]),
        span: dates.length - startIdx,
      });
    }
    return boundaries;
  }, [dates]);

  // ------- Navigation helpers -------

  const navigate = useCallback(
    (newFrom: string, newTo: string, newTeamId: number | null) => {
      const params = new URLSearchParams();
      params.set('from', newFrom);
      params.set('to', newTo);
      if (newTeamId !== null) {
        params.set('team_id', String(newTeamId));
      }
      router.push(`/timeline?${params.toString()}`);
    },
    [router],
  );

  const goToPrevMonth = useCallback(() => {
    const d = new Date(dateRange.from + 'T00:00:00');
    d.setMonth(d.getMonth() - 1);
    const { from, to } = computeMonthRange(
      d.getFullYear(),
      d.getMonth() + 1,
    );
    navigate(from, to, teamIdFilter);
  }, [dateRange.from, teamIdFilter, navigate]);

  const goToNextMonth = useCallback(() => {
    const d = new Date(dateRange.from + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    const { from, to } = computeMonthRange(
      d.getFullYear(),
      d.getMonth() + 1,
    );
    navigate(from, to, teamIdFilter);
  }, [dateRange.from, teamIdFilter, navigate]);

  const goToToday = useCallback(() => {
    const now = new Date();
    const { from, to } = computeMonthRange(
      now.getFullYear(),
      now.getMonth() + 1,
    );
    navigate(from, to, teamIdFilter);
  }, [teamIdFilter, navigate]);

  const handleTeamChange = useCallback(
    (value: string | null) => {
      const newTeamId =
        value === null || value === 'all' ? null : parseInt(value, 10);
      navigate(dateRange.from, dateRange.to, newTeamId);
    },
    [dateRange.from, dateRange.to, navigate],
  );

  // Human-readable label for current month
  const currentMonthLabel = new Date(
    dateRange.from + 'T12:00:00Z',
  ).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // ------- Render -------

  return (
    <div className="flex flex-col gap-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={goToPrevMonth}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {currentMonthLabel}
          </span>
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>

        {/* Team filter */}
        <Select
          value={teamIdFilter !== null ? String(teamIdFilter) : 'all'}
          onValueChange={handleTeamChange}
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gantt grid */}
      {dates.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          No dates in selected range.
        </div>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-border bg-card">
          <table
            className="border-collapse"
            style={{ minWidth: `${160 + dates.length * 32}px` }}
          >
            <thead>
              {/* Month row */}
              <tr>
                <th
                  className="sticky left-0 z-30 h-6 border-b border-r border-border bg-card px-2 text-left text-xs font-medium text-muted-foreground"
                  style={{ minWidth: 160, width: 160, boxShadow: '4px 0 6px -2px rgba(0,0,0,0.3)' }}
                />
                {monthBoundaries.map((mb) => (
                  <th
                    key={mb.startIdx}
                    colSpan={mb.span}
                    className="h-6 border-b border-border bg-card px-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    style={{ minWidth: mb.span * 32 }}
                  >
                    {mb.label}
                  </th>
                ))}
              </tr>

              {/* Day-of-week letter row */}
              <tr>
                <th
                  className="sticky left-0 z-30 h-5 border-b border-r border-border bg-card px-2 text-left text-[10px] font-medium text-muted-foreground"
                  style={{ minWidth: 160, width: 160, boxShadow: '4px 0 6px -2px rgba(0,0,0,0.3)' }}
                />
                {dates.map((d) => {
                  const weekend = isWeekend(d);
                  const bankHol = isBankHoliday(d);
                  return (
                    <th
                      key={`dow-${d}`}
                      className={cn(
                        'h-5 border-b border-border text-center text-[10px] font-normal',
                        weekend && 'bg-zinc-800/80 text-zinc-400',
                        bankHol && !weekend && 'bg-amber-900/30 text-amber-400',
                        !weekend && !bankHol && 'text-muted-foreground',
                      )}
                      style={{ width: 32, minWidth: 32, maxWidth: 32 }}
                    >
                      {dayLetter(d)}
                    </th>
                  );
                })}
              </tr>

              {/* Day number row */}
              <tr>
                <th
                  className="sticky left-0 z-30 h-6 border-b border-r border-border bg-card px-2 text-left text-xs font-medium text-muted-foreground"
                  style={{ minWidth: 160, width: 160, boxShadow: '4px 0 6px -2px rgba(0,0,0,0.3)' }}
                >
                  Staff
                </th>
                {dates.map((d) => {
                  const weekend = isWeekend(d);
                  const bankHol = isBankHoliday(d);
                  return (
                    <th
                      key={`day-${d}`}
                      className={cn(
                        'h-6 border-b border-border text-center text-[11px] font-semibold',
                        weekend && 'bg-zinc-800/80 text-zinc-400',
                        bankHol &&
                          !weekend &&
                          'bg-amber-900/30 text-amber-400',
                        !weekend && !bankHol && 'text-foreground',
                      )}
                      style={{ width: 32, minWidth: 32, maxWidth: 32 }}
                    >
                      {dayNum(d)}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {teamGroups.map(({ team, members }) => (
                <TeamSection
                  key={team.id}
                  team={team}
                  members={members}
                  dates={dates}
                  allocationMap={allocationMap}
                  normalWorkStatus={normalWorkStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-card px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Legend
        </span>
        <span className="h-3 w-px bg-border" />
        {statuses.map((s) => (
          <div key={s.id} className="flex items-center gap-1">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] text-muted-foreground">{s.name}</span>
          </div>
        ))}
        <span className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-zinc-800" />
          <span className="text-[11px] text-muted-foreground">Weekend</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ backgroundColor: '#92400e' }}
          />
          <span className="text-[11px] text-muted-foreground">Bank Holiday</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Render a team header row followed by member rows. */
function TeamSection({
  team,
  members,
  dates,
  allocationMap,
  normalWorkStatus,
}: {
  team: Team;
  members: StaffWithDetails[];
  dates: string[];
  allocationMap: Map<string, DailyAllocationWithDetails>;
  normalWorkStatus: Status | undefined;
}) {
  return (
    <>
      <tr key={`team-header-${team.id}`}>
        <td
          colSpan={dates.length + 1}
          className="sticky left-0 z-20 h-7 border-b border-border border-l-2 border-l-teal-500 bg-muted/60 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {team.name}
        </td>
      </tr>
      {members.map((member) => (
        <StaffRow
          key={`staff-${member.id}`}
          member={member}
          dates={dates}
          allocationMap={allocationMap}
          normalWorkStatus={normalWorkStatus}
        />
      ))}
    </>
  );
}

/** A single row for one staff member across all dates. */
function StaffRow({
  member,
  dates,
  allocationMap,
  normalWorkStatus,
}: {
  member: StaffWithDetails;
  dates: string[];
  allocationMap: Map<string, DailyAllocationWithDetails>;
  normalWorkStatus: Status | undefined;
}) {
  return (
    <tr className="group/row hover:bg-muted/20 transition-colors">
      <td
        className="sticky left-0 z-20 h-8 truncate border-b border-r border-border bg-card px-3 text-xs font-medium text-foreground group-hover/row:bg-muted/40"
        style={{ minWidth: 160, width: 160, maxWidth: 160, boxShadow: '4px 0 6px -2px rgba(0,0,0,0.3)' }}
        title={member.name}
      >
        {member.name}
      </td>

      {dates.map((d) => (
        <DayCell
          key={d}
          date={d}
          member={member}
          allocationMap={allocationMap}
          normalWorkStatus={normalWorkStatus}
        />
      ))}
    </tr>
  );
}

/** Individual day cell with status colour and tooltip. */
function DayCell({
  date,
  member,
  allocationMap,
  normalWorkStatus,
}: {
  date: string;
  member: StaffWithDetails;
  allocationMap: Map<string, DailyAllocationWithDetails>;
  normalWorkStatus: Status | undefined;
}) {
  const weekend = isWeekend(date);
  const bankHol = isBankHoliday(date);
  const alloc = allocationMap.get(`${member.id}:${date}`);

  let bgColor: string;
  let label: string;
  let tooltipStatus: string;
  let tooltipCategory: string;

  if (weekend) {
    bgColor = '#1e1e22';
    label = '';
    tooltipStatus = 'Weekend';
    tooltipCategory = '';
  } else if (bankHol && !alloc) {
    bgColor = '#92400e';
    label = 'BH';
    tooltipStatus = 'Bank Holiday';
    tooltipCategory = 'unavailable';
  } else if (alloc) {
    bgColor = alloc.status_color || DEFAULT_COLOR;
    label = statusAbbr(alloc.status_name);
    tooltipStatus = alloc.status_name;
    tooltipCategory = alloc.status_category;
  } else {
    bgColor = normalWorkStatus?.color || DEFAULT_COLOR;
    label = statusAbbr(normalWorkStatus?.name || DEFAULT_NAME);
    tooltipStatus = normalWorkStatus?.name || DEFAULT_NAME;
    tooltipCategory = normalWorkStatus?.category || 'available';
  }

  const textColor = weekend ? 'transparent' : textColorForBg(bgColor);

  const cellContent = (
    <div
      className={cn(
        'flex h-8 w-full items-center justify-center text-[10px] font-semibold leading-none',
        weekend &&
          'bg-[repeating-linear-gradient(135deg,transparent,transparent_2px,rgba(255,255,255,0.07)_2px,rgba(255,255,255,0.07)_4px)]',
      )}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {label}
    </div>
  );

  const tdStyle = { width: 32, minWidth: 32, maxWidth: 32 } as const;

  if (weekend) {
    return (
      <td className="h-8 border-b border-border p-0" style={tdStyle}>
        {cellContent}
      </td>
    );
  }

  return (
    <td className="h-8 border-b border-border p-0" style={tdStyle}>
      <Tooltip>
        <TooltipTrigger className="block h-full w-full">
          {cellContent}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          <div className="space-y-0.5">
            <div className="font-semibold">{member.name}</div>
            <div className="text-[11px] opacity-80">
              {new Date(date + 'T12:00:00Z').toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: bgColor }}
              />
              <span>{tooltipStatus}</span>
            </div>
            {tooltipCategory && (
              <div className="text-[10px] capitalize opacity-60">
                {tooltipCategory}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
