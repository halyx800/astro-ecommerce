import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const stockStatus = z.enum(["in-stock", "low-stock", "sold-out", "pre-order"]);

const variant = z.object({
  sku: z.string(),
  label: z.string(),
  price: z.number(),
  stockStatus,
  quantityAvailable: z.number().int().nonnegative().optional(),
});

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
});

const plants = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/plants" }),
  schema: baseProduct.extend({
    genus: z.string(),
    species: z.string().optional(),
    isHybrid: z.boolean(),
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
    category: z.enum(["growing", "science", "general"]),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().optional(),
    excerpt: z.string(),
  }),
});

export const collections = { plants, supplies, articles };
