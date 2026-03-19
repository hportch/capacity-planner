'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { StaffTable } from '@/components/staff/staff-table';
import type { StaffWithDetails, Team } from '@/lib/types';

interface StaffRosterProps {
  staff: StaffWithDetails[];
  teams: Team[];
  currentTeamFilter: string;
  showArchived: boolean;
}

export function StaffRoster({
  staff,
  teams,
  currentTeamFilter,
  showArchived,
}: StaffRosterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/staff?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={currentTeamFilter}
          onValueChange={(val) => updateFilter('team_id', val ?? '')}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id.toString()}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showArchived ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => updateFilter('show_archived', showArchived ? '' : '1')}
        >
          {showArchived ? 'Showing archived' : 'Show archived'}
        </Button>
      </div>

      <StaffTable staff={staff} />
    </div>
  );
}
