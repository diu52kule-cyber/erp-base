import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { bizConfig } from '@/lib/businessConfig';
import ProductForm from './ProductForm';

export default async function NewProductPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory')) redirect('/dashboard');
  const cfg = bizConfig(ctx.org?.business_type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/inventory"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Add Product</h1>
      </div>
      <ProductForm defaultUnit={cfg.defaultUnit} defaultGst={cfg.defaultGst} />
    </div>
  );
}
