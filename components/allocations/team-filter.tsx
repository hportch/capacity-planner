'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Team } from '@/lib/types';

interface TeamFilterProps {
  teams: Team[];
  currentTeamId: string | null;
}

export function TeamFilter({ teams, currentTeamId }: TeamFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === 'all') {
        params.delete('team_id');
      } else {
        params.set('team_id', value);
      }
      router.push(`/allocations?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <Select
      value={currentTeamId || 'all'}
      onValueChange={handleChange}
    >
      <SelectTrigger size="sm" className="min-w-[160px]">
        <SelectValue placeholder="All Teams" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectItem value="all">All Teams</SelectItem>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id.toString()}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
