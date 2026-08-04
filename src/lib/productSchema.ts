import { BUSINESS } from './businessInfo';

interface Variant {
  price: number;
}

interface ProductSchemaInput {
  name: string;
  description: string;
  url: string;
  images: string[];
  variants: Variant[];
  stockStatus: "in-stock" | "low-stock" | "sold-out" | "pre-order";
}

// Maps our own stock enum to Schema.org's fixed set of availability URIs.
const AVAILABILITY: Record<ProductSchemaInput["stockStatus"], string> = {
  "in-stock": "https://schema.org/InStock",
  "low-stock": "https://schema.org/LimitedAvailability",
  "sold-out": "https://schema.org/OutOfStock",
  "pre-order": "https://schema.org/PreOrder",
};

// One shared builder for plants and supplies — both are "a product with
// one or more priced/stocked variants" (baseProduct in content.config.ts),
// so the same Offer/AggregateOffer logic applies to either.
export function buildProductSchema(input: ProductSchemaInput) {
  const prices = input.variants.map(v => v.price);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const availability = AVAILABILITY[input.stockStatus];

  const offers = lowPrice === highPrice
    ? {
        "@type": "Offer",
        price: lowPrice,
        priceCurrency: "USD",
        availability,
        url: input.url,
      }
    : {
        "@type": "AggregateOffer",
        lowPrice,
        highPrice,
        priceCurrency: "USD",
        availability,
        url: input.url,
        offerCount: input.variants.length,
      };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.images,
    brand: { "@type": "Brand", name: BUSINESS.name },
    offers,
  };
}
