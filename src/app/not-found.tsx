import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-bold text-neutral-200 select-none">404</p>
        <h1 className="mt-4 text-xl font-semibold text-neutral-900">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
            Go to dashboard
          </Link>
          <Link href="/"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
