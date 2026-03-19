'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2Icon, RefreshCwIcon, CheckCircleIcon } from 'lucide-react';

interface HaloSyncButtonProps {
  year: number;
  lastBaseline: number;
}

export function HaloSyncButton({ year, lastBaseline }: HaloSyncButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/tickets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          capacity_baseline: lastBaseline,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await res.json();
      setResult(data.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
        ) : (
          <RefreshCwIcon className="size-4" data-icon="inline-start" />
        )}
        {syncing ? 'Syncing...' : 'Sync from HaloPSA'}
      </Button>
      {result && (
        <span className="flex items-center gap-1 text-xs text-green-500">
          <CheckCircleIcon className="size-3" />
          {result}
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
