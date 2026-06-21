import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import type { Product } from '@/lib/types/inventory';
import ProductForm from '../../new/ProductForm';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.enabledModules.has('inventory')) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: product }, { data: cats }] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).eq('org_id', ctx.org!.id).maybeSingle<Product>(),
    supabase.from('products').select('category').eq('org_id', ctx.org!.id).eq('is_active', true).not('category', 'is', null),
  ]);

  if (!product || !product.is_active) notFound();

  const categories = [...new Set((cats ?? []).map((c) => c.category).filter(Boolean))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/inventory/${params.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← {product.name}
        </Link>
        <h1 className="text-2xl font-semibold">Edit Product</h1>
      </div>
      <ProductForm mode="edit" product={product} categories={categories} />
    </div>
  );
}
