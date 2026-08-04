import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const plants = await getCollection('plants');
  const supplies = await getCollection('supplies');

  const entries = [
    ...plants.map(entry => ({
      kind: 'plants' as const,
      id: entry.id,
      title: entry.data.displayName,
      genus: entry.data.genus,
      tags: entry.data.tags,
      images: entry.data.images,
      variants: entry.data.variants,
      relatedProducts: entry.data.relatedProducts.map(r => ({ kind: r.collection, id: r.id.id })),
    })),
    ...supplies.map(entry => ({
      kind: 'supplies' as const,
      id: entry.id,
      title: entry.data.name,
      genus: undefined,
      tags: entry.data.tags,
      images: entry.data.images,
      variants: entry.data.variants,
      relatedProducts: entry.data.relatedProducts.map(r => ({ kind: r.collection, id: r.id.id })),
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
