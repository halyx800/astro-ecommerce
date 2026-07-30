import ProductBadge from './productBadge';

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
  description: string;
  price?: number;
  color?: string;
  colors?: string[];
  position: string;
  genus?: string;
  tags?: string[];
  variants?: Variant[];
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
  variants
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
        <a href="#">
          <div className="height-350">
            <img className="w-100 h-100 p-4 rounded-top" src={`${import.meta.env.BASE_URL}${thumb_src}`} alt={thumb_alt} />
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
                  <span key={tag} className="badge bg-secondary me-1">{tag}</span>
                ))}
              </div>
            }

            {(priceLabel) &&
              <h4 className="mb-0 text-lg mt-1 mb-3">
                {priceLabel}
              </h4>
            }

            {!(description || colors || color) &&
              <a href="#" className="font-weight-normal text-body text-sm">Shop Now</a>
            }
          </div>
        </a>
      </div>
    </>
  );
};
