import { StaffForm } from '@/components/staff/staff-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Add Staff Member - Capacity Planner',
};

export default function NewStaffPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/staff" />}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to roster
        </Button>
      </div>
      <StaffForm mode="create" />
    </div>
  );
}
