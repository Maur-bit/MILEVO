import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { CategoryManager } from './CategoryManager';

export const metadata: Metadata = { title: 'Category Management' };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('id, name, slug, parent_id').order('name');
  if (error) throw new Error(`Unable to load categories: ${error.message}`);
  return (
    <section>
      <div className="border-b border-milevo-border p-5">
        <h1 className="font-display text-xl font-bold">Category management</h1>
        <p className="mt-1 text-sm text-milevo-muted">Edit names and organize the product catalog.</p>
      </div>
      <CategoryManager categories={data ?? []} />
    </section>
  );
}
