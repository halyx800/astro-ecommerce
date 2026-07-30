import ProductRating from '../reviews/reviewRating'
import ProductGallery from './productGallery'
import ProductSizes from './productSizes'

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
  variants
}: Props) {

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
          <ProductGallery images={images}/>
        }
        <div className="col-12 col-lg-6 ps-lg-5">
          {(genus) &&
            <h6 className="text-md mb-1 text-body">{genus}</h6>
          }
          {(title.length != 0) &&
            <h2 className="mt-4">{title}</h2>
          }
          {(full_description) &&
            <p className="mb-5">{full_description}</p>
          }

          {(tags && tags.length > 0) &&
            <div className="mb-3">
              {tags.map(tag => (
                <span key={tag} className="badge bg-secondary me-1">{tag}</span>
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
              <ProductSizes variants={variants}/>
            }
            {(!variants && sizes && sizes.size != 0) &&
              <ProductSizes sizes={sizes}/>
            }
            <button className="btn btn-dark btn-lg" type="submit">Add to cart</button>
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
