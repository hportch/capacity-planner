'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadIcon, Loader2Icon, FileSpreadsheetIcon } from 'lucide-react';

interface ImportResult {
  imported: number;
  skipped: number;
  skippedDetails: { row: number; reason: string }[];
  total: number;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header row
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    rows.push(row);
  }
  return rows;
}

// Try to match common column name variations
function resolveColumn(row: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    const key = Object.keys(row).find((k) => k.toLowerCase().replace(/[_\s-]/g, '') === c.toLowerCase().replace(/[_\s-]/g, ''));
    if (key && row[key]) return row[key];
  }
  return '';
}

export function CSVImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError('No data rows found in CSV');
        setPreview(null);
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!preview) return;

    setImporting(true);
    setError(null);
    setResult(null);

    // Map CSV rows to the API format
    const allocations = preview.map((row) => ({
      staff_name: resolveColumn(row, ['staff_name', 'staffname', 'name', 'staff', 'employee']),
      date: resolveColumn(row, ['date', 'day']),
      status_name: resolveColumn(row, ['status_name', 'statusname', 'status', 'allocation', 'type']),
      notes: resolveColumn(row, ['notes', 'note', 'detail', 'details', 'description', 'comment']) || undefined,
    }));

    try {
      const res = await fetch('/api/allocations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }

      const data: ImportResult = await res.json();
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheetIcon className="size-5" />
          Import Historical Allocations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a CSV file with columns: <code className="rounded bg-muted px-1 py-0.5 text-xs">staff_name</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">date</code> (YYYY-MM-DD),{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">status_name</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">notes</code> (optional).
          Staff and status names must match existing records.
        </p>

        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon className="size-4" data-icon="inline-start" />
            {fileName || 'Choose CSV file'}
          </Button>
          {preview && (
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importing}
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              {importing ? (
                <Loader2Icon className="size-4 animate-spin" data-icon="inline-start" />
              ) : null}
              {importing ? 'Importing...' : `Import ${preview.length} rows`}
            </Button>
          )}
          {(preview || result) && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>

        {/* Preview */}
        {preview && !result && (
          <div className="max-h-60 overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {Object.keys(preview[0]).map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-2 py-1">
                        {v || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr>
                    <td
                      colSpan={Object.keys(preview[0]).length}
                      className="px-2 py-1.5 text-center text-muted-foreground"
                    >
                      ...and {preview.length - 10} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2 rounded border p-3">
            <p className="text-sm font-medium text-green-500">
              Imported {result.imported} of {result.total} allocations
            </p>
            {result.skipped > 0 && (
              <div>
                <p className="text-sm text-amber-500">
                  {result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped:
                </p>
                <ul className="mt-1 max-h-32 overflow-auto text-xs text-muted-foreground">
                  {result.skippedDetails.map((s, i) => (
                    <li key={i}>Row {s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
