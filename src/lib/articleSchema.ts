import { BUSINESS } from './businessInfo';

interface ArticleSchemaInput {
  type: "Article" | "BlogPosting";
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished: Date;
}

// Shared by articles and blog posts — both are "a dated piece of writing
// with a headline," just under different schema.org types. No individual
// byline exists on this site, so the business itself is both author and
// publisher, same as `brand` on Product schema.
// No `publisher.logo` yet — see PROJECT_NOTES.md, this needs a real logo
// file before it's fully rich-result-eligible.
export function buildArticleSchema(input: ArticleSchemaInput) {
  const organization = {
    "@type": "Organization",
    name: BUSINESS.name,
  };

  return {
    "@context": "https://schema.org",
    "@type": input.type,
    headline: input.headline,
    description: input.description,
    ...(input.image ? { image: input.image } : {}),
    datePublished: input.datePublished.toISOString(),
    mainEntityOfPage: input.url,
    author: organization,
    publisher: organization,
  };
}
