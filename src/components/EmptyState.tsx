import Link from 'next/link';

export default function EmptyState({ icon = '📭', title, description, actionLabel, actionHref }: {
  icon?: string; title: string; description?: string; actionLabel?: string; actionHref?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-semibold text-neutral-900">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-5 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
