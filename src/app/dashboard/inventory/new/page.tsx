import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ProductForm from './ProductForm';

export default async function NewProductPage() {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory')) redirect('/dashboard');

  const supabase = createClient();
  const { data: cats } = await supabase
    .from('products')
    .select('category')
    .eq('org_id', ctx.org!.id)
    .eq('is_active', true)
    .not('category', 'is', null);

  const categories = [...new Set((cats ?? []).map((c) => c.category).filter(Boolean))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inventory" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold">Add Product</h1>
      </div>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
