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
import { Button } from '@/components/ui/button';
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
  const [archiving, setArchiving] = useState<number | null>(null);

  async function handleArchive(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (archiving) return;
    setArchiving(id);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setArchiving(null);
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
              <StaffStatusBadge isActive={member.is_active} />
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
                      disabled={archiving === member.id}
                      onClick={(e) => handleArchive(member.id, e)}
                    >
                      <Archive className="size-4" />
                      {archiving === member.id ? 'Archiving...' : 'Archive'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
