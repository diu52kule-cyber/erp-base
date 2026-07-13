'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl select-none">⚠️</p>
        <h1 className="mt-4 text-xl font-semibold text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-500">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-neutral-400 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            Try again
          </button>
          <a href="/dashboard"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
