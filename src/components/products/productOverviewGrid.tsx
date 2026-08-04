import { useState } from 'react';
import ProductRating from '../reviews/reviewRating'
import ProductGallery from './productGallery'
import ProductSizes from './productSizes'
import { slugify } from '../../lib/slugify';
import { addToCart } from '../../lib/cart';

interface Variant {
  sku: string;
  label: string;
  price: number;
  stockStatus: "in-stock" | "low-stock" | "sold-out" | "pre-order";
  quantityAvailable?: number;
}

interface Props {
  title: string;
  colors?: string[];
  images: (string | { src: string; alt: string })[];
  full_description?: string;
  price?: number;
  highlights?: string[];
  details?: string;
  rating?: number;
  reviews?: number;
  sizes?: Map<string,number>;
  genus?: string;
  tags?: string[];
  variants?: Variant[];
  href?: string;
}

export default function ProductOverview({
  title,
  colors,
  images,
  full_description,
  price,
  highlights,
  details,
  rating,
  reviews,
  sizes,
  genus,
  tags,
  variants,
  href
}: Props) {

  const firstAvailable = variants?.find(v => v.stockStatus !== "sold-out") ?? variants?.[0];
  const [selectedSku, setSelectedSku] = useState<string | undefined>(firstAvailable?.sku);
  const [added, setAdded] = useState(false);

  const selectedVariant = variants?.find(v => v.sku === selectedSku);

  const thumb_src = images.length > 0
    ? (typeof images[0] === "string" ? images[0] : images[0].src)
    : '';

  // Give real, descriptive alt text (the product's actual name) instead of
  // ProductGallery's generic "Product image N" fallback — matters for
  // accessibility and image-search visibility.
  const galleryImages = images.map((img, i) => {
    const src = typeof img === "string" ? img : img.src;
    const alt = typeof img === "string"
      ? (i === 0 ? title : `${title} — additional photo ${i + 1}`)
      : img.alt;
    return { src, alt };
  });

  function handleAddToCart() {
    if (!selectedVariant || selectedVariant.stockStatus === "sold-out") return;
    addToCart({
      sku: selectedVariant.sku,
      title: `${title} — ${selectedVariant.label}`,
      price: selectedVariant.price,
      thumb_src,
      href: href ?? '',
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const priceLabel = (() => {
    if (variants && variants.length > 0) {
      const prices = variants.map(v => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max
        ? `$${min.toLocaleString()}`
        : `$${min.toLocaleString()} – $${max.toLocaleString()}`;
    }
    return (price != null) ? `$${price.toLocaleString()}` : null;
  })();

  return (
    <>
    <div className="card card-product card-plain">
      <div className="row">
        {(images.length != 0) &&
          <ProductGallery images={galleryImages}/>
        }
        <div className="col-12 col-lg-6 ps-lg-5">
          {(genus) &&
            <h6 className="text-md mb-1 text-body">{genus}</h6>
          }
          {(title.length != 0) &&
            <h1 className="h2 mt-4">{title}</h1>
          }
          {(full_description) &&
            <p className="mb-5">{full_description}</p>
          }

          {(tags && tags.length > 0) &&
            <div className="mb-3">
              {tags.map(tag => (
                <a key={tag} href={`${import.meta.env.BASE_URL}/tags/${slugify(tag)}/`} className="badge bg-secondary me-1 text-decoration-none">{tag}</a>
              ))}
            </div>
          }

          <form action="" method="post">
            {(priceLabel) &&
              <div className="d-flex">
                <h3 className="font-weight-normal">{priceLabel}</h3>
              </div>
            }

            {(rating) &&
            <>
              <h3 className="sr-only">Reviews</h3>
              <div className="d-flex">
                <ProductRating rating={4} />
                <span className="ms-3">{reviews} reviews</span>
              </div>
            </>
            }

            {(variants && variants.length > 0) &&
              <ProductSizes variants={variants} selected={selectedSku} onSelect={setSelectedSku}/>
            }
            {(!variants && sizes && sizes.size != 0) &&
              <ProductSizes sizes={sizes}/>
            }
            {(variants && variants.length > 0) ?
              <button
                className="btn btn-dark btn-lg"
                type="button"
                disabled={!selectedVariant || selectedVariant.stockStatus === "sold-out"}
                onClick={handleAddToCart}
              >
                {added ? "Added!" : (selectedVariant?.stockStatus === "sold-out" ? "Sold Out" : "Add to cart")}
              </button>
            :
              <button className="btn btn-dark btn-lg" type="submit">Add to cart</button>
            }
          </form>
        </div>
      </div>

      {(details || (highlights && highlights.length != 0)) &&
        <div className="row mt-5">
          <div className="col-12 col-lg-6">
            <h4>Product Description</h4>
            {(details) &&
              <>
                <h6>More about product</h6>
                <p>{details}</p>
              </>
            }
            {(highlights && highlights.length != 0) &&
             <>
               <h6>Benefits</h6>
                <ul className="text-sm">
                {highlights.map(highlight =>
                  <li className="mb-2">{highlight}</li>
                )}
                </ul>
             </>
            }
          </div>
        </div>
      }
    </div>
    </>
  );
};
