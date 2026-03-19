'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Team, Role, StaffWithDetails } from '@/lib/types';

interface StaffFormProps {
  mode: 'create' | 'edit';
  staff?: StaffWithDetails;
}

export function StaffForm({ mode, staff }: StaffFormProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(staff?.name ?? '');
  const [teamId, setTeamId] = useState<string>(staff?.team_id?.toString() ?? '');
  const [roleId, setRoleId] = useState<string>(staff?.role_id?.toString() ?? '');
  const [startDate, setStartDate] = useState(staff?.start_date ?? '');
  const [contractedHours, setContractedHours] = useState<string>(
    staff?.contracted_hours?.toString() ?? '37.5'
  );
  const [notes, setNotes] = useState(staff?.notes ?? '');

  useEffect(() => {
    Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/roles').then((r) => r.json()),
    ]).then(([teamsData, rolesData]) => {
      setTeams(teamsData);
      setRoles(rolesData);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !teamId || !roleId || !startDate) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        team_id: Number(teamId),
        role_id: Number(roleId),
        start_date: startDate,
        contracted_hours: Number(contractedHours) || 37.5,
        notes: notes.trim() || null,
      };

      const url = mode === 'create' ? '/api/staff' : `/api/staff/${staff!.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save staff member');
      }

      router.push('/staff');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}</CardTitle>
        <CardDescription>
          {mode === 'create'
            ? 'Add a new team member to the capacity planner.'
            : `Editing ${staff?.name}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Team *</Label>
              <Select value={teamId} onValueChange={(val) => setTeamId(val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Role *</Label>
              <Select value={roleId} onValueChange={(val) => setRoleId(val ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contracted_hours">Contracted Hours</Label>
              <Input
                id="contracted_hours"
                type="number"
                step="0.5"
                min="0"
                max="60"
                value={contractedHours}
                onChange={(e) => setContractedHours(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this team member..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Add Staff Member'
                  : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/staff')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
