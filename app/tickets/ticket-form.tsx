'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMonthName } from '@/lib/utils';

interface TicketFormProps {
  year: number;
  existingMonths: number[];
  lastBaseline: number;
  lastSystem: string;
}

export function TicketForm({ year, existingMonths, lastBaseline, lastSystem }: TicketFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    const body = {
      year,
      month: Number(formData.get('month')),
      capacity_baseline: Number(formData.get('capacity_baseline')),
      tickets_opened: Number(formData.get('tickets_opened')),
      tickets_closed: Number(formData.get('tickets_closed')),
      ticket_system: (formData.get('ticket_system') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const isUpdate = existingMonths.includes(body.month);
      setSuccess(
        `${getMonthName(body.month)} ${year} ${isUpdate ? 'updated' : 'added'} successfully.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="month">Month</Label>
          <select
            id="month"
            name="month"
            required
            defaultValue=""
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="" disabled>
              Select...
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)} {existingMonths.includes(m) ? '(update)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity_baseline">Baseline</Label>
          <Input
            id="capacity_baseline"
            name="capacity_baseline"
            type="number"
            required
            min={0}
            defaultValue={lastBaseline}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tickets_opened">Opened</Label>
          <Input
            id="tickets_opened"
            name="tickets_opened"
            type="number"
            required
            min={0}
            defaultValue=""
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tickets_closed">Closed</Label>
          <Input
            id="tickets_closed"
            name="tickets_closed"
            type="number"
            required
            min={0}
            defaultValue=""
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket_system">System</Label>
          <Input
            id="ticket_system"
            name="ticket_system"
            defaultValue={lastSystem}
            placeholder="e.g. HaloPSA"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            name="notes"
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Record'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
      </div>
    </form>
  );
}
