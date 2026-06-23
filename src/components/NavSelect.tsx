'use client';

export default function NavSelect({
  name, value, options, baseHref, extraParams = {},
  className,
}: {
  name: string;
  value: string;
  options: { label: string; value: string }[];
  baseHref: string;
  extraParams?: Record<string, string>;
  className?: string;
}) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams({ ...extraParams, [name]: e.target.value });
    window.location.href = `${baseHref}?${params.toString()}`;
  }
  return (
    <select
      value={value}
      onChange={handleChange}
      className={className ?? 'rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
