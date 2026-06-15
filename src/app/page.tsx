import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Your business, one platform</h1>
      <p className="text-neutral-600">
        Billing, payments, inventory, CRM and HR — switch on only what you need.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded-lg bg-neutral-900 px-5 py-2.5 text-white">
          Get started
        </Link>
        <Link href="/login" className="rounded-lg border border-neutral-300 px-5 py-2.5">
          Log in
        </Link>
      </div>
    </main>
  );
}
