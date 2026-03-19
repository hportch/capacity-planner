'use client'

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="border-red-800 bg-red-950/50">
          <AlertCircle className="size-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm mb-4">
              {error.message || 'An unexpected error occurred while loading the dashboard.'}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mb-4 font-mono">
                Error ID: {error.digest}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
