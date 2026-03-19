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
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  const [endDate, setEndDate] = useState(staff?.end_date ?? '');
  const [isActive, setIsActive] = useState(staff?.is_active !== 0);
  const [isVacancy, setIsVacancy] = useState(staff?.is_vacancy === 1);
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

  const selectedTeam = teams.find((t) => t.id.toString() === teamId);
  const selectedRole = roles.find((r) => r.id.toString() === roleId);

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
        end_date: !isActive && endDate ? endDate : null,
        is_active: isActive ? 1 : 0,
        is_vacancy: isVacancy ? 1 : 0,
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
                    <span data-slot="select-value" className="flex flex-1 text-left">
                    {selectedTeam?.name ?? staff?.team_name ?? 'Select team'}
                  </span>
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
                    <span data-slot="select-value" className="flex flex-1 text-left">
                    {selectedRole?.name ?? staff?.role_name ?? 'Select role'}
                  </span>
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

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_vacancy" className="text-sm font-medium">Vacancy placeholder</Label>
                <p className="text-xs text-muted-foreground">
                  Mark as a vacancy to track an unfilled position in the team.
                </p>
              </div>
              <Switch
                id="is_vacancy"
                checked={isVacancy}
                onCheckedChange={setIsVacancy}
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active" className="text-sm font-medium">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn off to mark as left. They won&apos;t appear in allocations or future views.
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => {
                    setIsActive(checked);
                    if (!checked && !endDate) {
                      setEndDate(new Date().toISOString().split('T')[0]);
                    }
                  }}
                />
              </div>

              {!isActive && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="end_date">Last Working Day</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

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
