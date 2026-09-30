import type { Metadata } from 'next';
import { SearchClient } from '@/app/search/SearchClient';
import { CATEGORIES } from '@/data/seedData';

type Params = Promise<{ category: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  const cat = CATEGORIES.find((c) => c.slug === category);
  return { title: cat ? cat.name : 'Category' };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  return (
    <SearchClient
      initialQuery=""
      initialCategory={category === 'all' ? null : category}
      initialFilters={{}}
      initialSort="relevance"
      initialPage={1}
    />
  );
}
