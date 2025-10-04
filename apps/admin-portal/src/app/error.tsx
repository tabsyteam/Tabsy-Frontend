'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);

    // Check if it's a chunk loading error
    const isChunkError =
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    // Auto-retry once for chunk errors (dev server timing issue)
    if (isChunkError) {
      console.log('Chunk loading error detected, attempting auto-retry...');
      setTimeout(() => {
        reset();
      }, 500);
    }
  }, [error, reset]);

  // Check if it's a chunk loading error
  const isChunkError =
    error.message.includes('Loading chunk') ||
    error.message.includes('ChunkLoadError') ||
    error.name === 'ChunkLoadError';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-default bg-surface p-6 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-content-primary">
            {isChunkError ? 'Loading...' : 'Something went wrong!'}
          </h2>
          <p className="text-sm text-content-secondary">
            {isChunkError
              ? 'The application is starting up. Please wait...'
              : 'An error occurred while loading this page.'
            }
          </p>
        </div>

        {!isChunkError && (
          <div className="rounded-md bg-surface-secondary p-3">
            <p className="text-xs font-mono text-content-tertiary break-all">
              {error.message}
            </p>
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isChunkError ? 'Retrying...' : 'Try again'}
        </button>

        {!isChunkError && (
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-md border border-default bg-surface px-4 py-2 text-sm font-medium text-content-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Reload page
          </button>
        )}
      </div>
    </div>
  );
}
