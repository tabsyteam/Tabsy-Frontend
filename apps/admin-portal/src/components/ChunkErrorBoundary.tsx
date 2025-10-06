'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkError =
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    return {
      hasError: true,
      error,
      errorCount: isChunkError ? 0 : 1,
    };
  }

  override componentDidCatch(error: Error) {
    const isChunkError =
      error.message.includes('Loading chunk') ||
      error.message.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    if (isChunkError && this.state.errorCount < 3) {
      // Auto-retry for chunk errors (dev server timing issue)
      console.log('Chunk error detected, auto-retrying...', this.state.errorCount + 1);
      setTimeout(() => {
        this.setState({ hasError: false, errorCount: this.state.errorCount + 1 });
        window.location.reload();
      }, 1000);
    }
  }

  override render() {
    if (this.state.hasError && this.state.errorCount >= 3) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md space-y-4 rounded-lg border border-default bg-surface p-6">
            <h2 className="text-xl font-bold text-content-primary">
              Failed to load application
            </h2>
            <p className="text-sm text-content-secondary">
              Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
