'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StaffStatusBadge } from '@/components/staff/staff-status-badge';
import { formatDate } from '@/lib/utils';
import type { StaffWithDetails } from '@/lib/types';
import { MoreHorizontal, Pencil, Archive } from 'lucide-react';
import { useState } from 'react';

interface StaffTableProps {
  staff: StaffWithDetails[];
}

export function StaffTable({ staff }: StaffTableProps) {
  const router = useRouter();
  const [archiveTarget, setArchiveTarget] = useState<StaffWithDetails | null>(null);
  const [leavingDate, setLeavingDate] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  function openArchiveDialog(member: StaffWithDetails, e: React.MouseEvent) {
    e.stopPropagation();
    setArchiveTarget(member);
    setLeavingDate(new Date().toISOString().split('T')[0]);
    setArchiveError(null);
  }

  async function confirmArchive() {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    setArchiveError(null);

    try {
      const res = await fetch(`/api/staff/${archiveTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: 0,
          end_date: leavingDate || new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to archive');
      }

      setArchiveTarget(null);
      router.refresh();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setArchiving(false);
    }
  }

  if (staff.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-muted-foreground">
        No staff members found.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow
              key={member.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors duration-150 even:bg-muted/10"
              onClick={() => router.push(`/staff/${member.id}`)}
            >
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell>{member.team_name}</TableCell>
              <TableCell>{member.role_name}</TableCell>
              <TableCell className="font-mono">{formatDate(member.start_date)}</TableCell>
              <TableCell>
                <StaffStatusBadge isActive={member.is_active} isVacancy={member.is_vacancy} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/staff/${member.id}`);
                      }}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    {member.is_active === 1 && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => openArchiveDialog(member, e)}
                      >
                        <Archive className="size-4" />
                        Mark as left
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark {archiveTarget?.name} as left</DialogTitle>
            <DialogDescription>
              They will be removed from allocations and utilisation forecasts
              from the leaving date onward.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="leaving-date">Last working day</Label>
            <Input
              id="leaving-date"
              type="date"
              value={leavingDate}
              onChange={(e) => setLeavingDate(e.target.value)}
            />
          </div>
          {archiveError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {archiveError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveTarget(null)}
              disabled={archiving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmArchive}
              disabled={archiving || !leavingDate}
            >
              {archiving ? 'Archiving...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
