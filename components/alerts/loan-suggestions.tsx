'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowRightLeft, CheckIcon, Loader2Icon, UserPlusIcon } from 'lucide-react';

export interface LoanSuggestion {
  date: string;
  target_team_id: number;
  target_team_name: string;
  target_team_utilisation: number;
  target_team_threshold: number;
  candidate_id: number;
  candidate_name: string;
  candidate_team_name: string;
  candidate_role: string;
}

interface LoanSuggestionsProps {
  suggestions: LoanSuggestion[];
  loanedStatusId: number | null;
}

export function LoanSuggestions({ suggestions, loanedStatusId }: LoanSuggestionsProps) {
  const router = useRouter();
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-sm text-teal-500">No loan suggestions needed — all teams are above threshold.</p>
      </div>
    );
  }

  // Group by target team + date
  const grouped = new Map<string, LoanSuggestion[]>();
  for (const s of suggestions) {
    const key = `${s.target_team_name}|${s.date}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  async function handleApply(suggestion: LoanSuggestion) {
    if (!loanedStatusId) return;
    const key = `${suggestion.candidate_id}_${suggestion.date}`;
    setApplying(key);

    try {
      const res = await fetch('/api/allocations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: [{
            staff_id: suggestion.candidate_id,
            date: suggestion.date,
            status_id: loanedStatusId,
            notes: `Loaned to ${suggestion.target_team_name}`,
          }],
        }),
      });

      if (res.ok) {
        setApplied((prev) => new Set(prev).add(key));
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ArrowRightLeft className="size-4 text-violet-400" />
        <h3 className="text-sm font-medium">Loan Suggestions</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {suggestions.length} candidate{suggestions.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Short Team</TableHead>
            <TableHead className="text-xs">Utilisation</TableHead>
            <TableHead className="text-xs">Candidate</TableHead>
            <TableHead className="text-xs">From Team</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suggestions.map((s, i) => {
            const key = `${s.candidate_id}_${s.date}`;
            const isApplied = applied.has(key);
            const isApplying = applying === key;

            return (
              <TableRow key={`${key}-${i}`}>
                <TableCell className="text-xs font-mono py-1.5">
                  {formatDate(s.date)}
                </TableCell>
                <TableCell className="text-xs font-medium py-1.5">
                  {s.target_team_name}
                </TableCell>
                <TableCell className="text-xs py-1.5">
                  <span className="font-mono tabular-nums text-red-400">
                    {Math.round(s.target_team_utilisation * 100)}%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    / {Math.round(s.target_team_threshold * 100)}%
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium py-1.5">
                  <div className="flex items-center gap-1.5">
                    <UserPlusIcon className="size-3 text-violet-400" />
                    {s.candidate_name}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">
                  {s.candidate_team_name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">
                  {s.candidate_role}
                </TableCell>
                <TableCell className="text-right py-1.5">
                  {isApplied ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-500">
                      <CheckIcon className="size-3" />
                      Applied
                    </span>
                  ) : loanedStatusId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2"
                      onClick={() => handleApply(s)}
                      disabled={isApplying}
                    >
                      {isApplying ? (
                        <Loader2Icon className="size-3 animate-spin" />
                      ) : (
                        'Apply Loan'
                      )}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No &apos;Loaned&apos; status</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
