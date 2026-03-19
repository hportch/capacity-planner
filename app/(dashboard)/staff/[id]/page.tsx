import { notFound } from 'next/navigation';
import { dbGet } from '@/lib/db';
import { StaffForm } from '@/components/staff/staff-form';
import type { StaffWithDetails } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Edit Staff Member - Capacity Planner',
};

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const staff = await dbGet<StaffWithDetails>(`
    SELECT s.*, t.name as team_name, r.name as role_name
    FROM staff s
    JOIN teams t ON s.team_id = t.id
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = ?
  `, [Number(id)]);

  if (!staff) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/staff" />}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to roster
        </Button>
      </div>
      <StaffForm mode="edit" staff={staff} />
    </div>
  );
}
