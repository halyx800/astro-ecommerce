import ProductBadge from './productBadge';
import { slugify } from '../../lib/slugify';

interface Variant {
  sku: string;
  label: string;
  price: number;
  stockStatus: "in-stock" | "low-stock" | "sold-out" | "pre-order";
  quantityAvailable?: number;
}

interface Props {
  thumb_src: string;
  thumb_alt: string;
  title: string;
  description?: string;
  price?: number;
  color?: string;
  colors?: string[];
  position: string;
  genus?: string;
  tags?: string[];
  variants?: Variant[];
  href?: string;
}

export default function CardProduct({
  thumb_src,
  thumb_alt,
  title,
  description,
  price,
  color,
  colors,
  position,
  genus,
  tags,
  variants,
  href
}: Props) {

  const classList = "card-body " + "text-" + position;

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
      <div className="card card-product border mb-5 shadow-xs border-radius-lg">
        <a href={href ?? "#"}>
          <div className="height-350">
            <img className="w-100 h-100 p-4 rounded-top" src={`${import.meta.env.BASE_URL}${thumb_src.replace(/^\//, '')}`} alt={thumb_alt} />
          </div>
          <div className={classList}>
            {(genus) &&
              <h6 className="text-md mb-1 text-body">{genus}</h6>
            }
            {(color) &&
              <h6 className="text-md mb-1 text-body">{color}</h6>
            }
            {(title) &&
              <h4 className="font-weight-bold">
                {title}
              </h4>
            }

            {(description) &&
              <p className="text-body">{description}</p>
            }

            {(colors) &&
              <ProductBadge colors={colors} />
            }

            {(tags && tags.length > 0) &&
              <div className="mb-2">
                {tags.map(tag => (
                  <a key={tag} href={`${import.meta.env.BASE_URL}tags/${slugify(tag)}/`} className="badge bg-secondary me-1 text-decoration-none">{tag}</a>
                ))}
              </div>
            }

            {(priceLabel) &&
              <h4 className="mb-0 text-lg mt-1 mb-3">
                {priceLabel}
              </h4>
            }

            {!(description || colors || color) &&
              <a href={href ?? "#"} className="font-weight-normal text-body text-sm">Shop Now</a>
            }
          </div>
        </a>
      </div>
    </>
  );
};
