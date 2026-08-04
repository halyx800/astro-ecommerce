import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

const stockStatus = z.enum(["in-stock", "low-stock", "sold-out", "pre-order"]);

const variant = z.object({
  sku: z.string(),
  label: z.string(),
  price: z.number(),
  stockStatus,
  quantityAvailable: z.number().int().nonnegative().optional(),
});

// A reference to one real plant or supply entry. Each entry states its own
// collection explicitly (rather than a bare union of references) so Zod
// validates against the *correct* collection instead of always guessing
// "plants" first and failing on any supply. Shared by baseProduct's
// relatedProducts below and by articles/blogPosts' mentionedProducts —
// same underlying need ("point at a real catalog item"), different context.
const productReference = z.discriminatedUnion("collection", [
  z.object({ collection: z.literal("plants"), id: reference("plants") }),
  z.object({ collection: z.literal("supplies"), id: reference("supplies") }),
]);

// Optional overrides for how a listing looks when *shared* (Open Graph),
// separate from the actual on-page title/description. A catchy social
// blurb doesn't have to match the accurate, taxonomic page title — when
// unset, pages fall back to the real title/an auto-generated excerpt.
const seoOverrides = {
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
};

// Shared shape for anything purchasable, regardless of product type.
// Category-specific fields (taxonomy, category enums, etc.) get layered on
// top via .extend() in each collection below — new product types add a new
// collection that extends this instead of redefining these fields.
const baseProduct = z.object({
  variants: z.array(variant),
  stockStatus,
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  // Hand-curated recommendations only — not derived from tags/genus.
  relatedProducts: z.array(productReference).default([]),
  ...seoOverrides,
});

const plants = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/plants" }),
  schema: baseProduct.extend({
    genus: z.string(),
    species: z.string().optional(),
    taxonomicStatus: z.enum(["species", "hybrid"]).optional(),
    hybridName: z.string().optional(),
    cultivarName: z.string().optional(),
    commonName: z.string().optional(),
    displayName: z.string(),
    type: z.enum(["clone", "division", "seedling", "mystery"]),
    rarity: z.enum(["common", "uncommon", "rare"]),
    publishDate: z.coerce.date(),
  }),
});

const supplies = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/supplies" }),
  schema: baseProduct.extend({
    name: z.string(),
    category: z.enum(["media", "hormones", "fertilizer", "books"]),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
    excerpt: z.string(),
    // Lets an article point at a real catalog item it discusses — e.g. a
    // growing guide for a species we actually carry. Optional; most
    // articles won't reference anything.
    mentionedProducts: z.array(productReference).default([]),
    ...seoOverrides,
  }),
});

const faqs = defineCollection({
  // Single file, rarely edited — each question is just a heading in the
  // body text, not a separate entry. No per-question metadata needed.
  loader: glob({ pattern: "**/*.md", base: "./src/content/faqs" }),
  schema: z.object({}),
});

const blogPosts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    // External only — never hosted on this site itself (X, YouTube, etc.).
    videoUrl: z.string().url().optional(),
    coverImage: z.string().optional(),
    mentionedProducts: z.array(productReference).default([]),
    // Hand-set, not measured — see PROJECT_NOTES.md. Unset posts sort by
    // date; a set value bubbles a post above unprioritized ones.
    priority: z.number().optional(),
    ...seoOverrides,
  }),
});

export const collections = { plants, supplies, articles, faqs, blogPosts };
