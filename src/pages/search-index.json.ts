import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { abbreviationsFor } from '../lib/orchidAbbreviations';

export const GET: APIRoute = async () => {
  const plants = await getCollection('plants');
  const supplies = await getCollection('supplies');
  const articles = await getCollection('articles');
  const blogPosts = await getCollection('blogPosts');

  const entries = [
    ...plants.map(entry => ({
      title: entry.data.displayName,
      subtitle: entry.data.genus,
      tags: entry.data.tags,
      abbreviations: abbreviationsFor(entry.data.genus),
      url: `${import.meta.env.BASE_URL}plants/${entry.id}/`,
    })),
    ...supplies.map(entry => ({
      title: entry.data.name,
      subtitle: entry.data.category,
      tags: entry.data.tags,
      abbreviations: [] as string[],
      url: `${import.meta.env.BASE_URL}supplies/${entry.id}/`,
    })),
    ...articles.map(entry => ({
      title: entry.data.title,
      subtitle: 'Article',
      tags: entry.data.tags,
      abbreviations: [] as string[],
      url: `${import.meta.env.BASE_URL}articles/${entry.id}/`,
    })),
    ...blogPosts.map(entry => ({
      title: entry.data.title,
      subtitle: 'Blog Post',
      tags: entry.data.tags,
      abbreviations: [] as string[],
      url: `${import.meta.env.BASE_URL}blog/${entry.id}/`,
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
