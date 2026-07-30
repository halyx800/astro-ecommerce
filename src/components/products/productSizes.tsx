interface Variant {
  sku: string;
  label: string;
  price: number;
  stockStatus: "in-stock" | "low-stock" | "sold-out" | "pre-order";
  quantityAvailable?: number;
}

interface Props {
  sizes?: Map<string,number>;
  variants?: Variant[];
}

export default function ProductSizes({
  sizes,
  variants,
}: Props) {

  const sizeID = Date.now();

  return (
    <>
      <div className="mt-4 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Size</h6>
        <a href="#" className="text-body mb-0">Size guide</a>
      </div>
      <div className="d-flex flex-wrap text-center my-4">
        {variants ? variants.map((variant, i) =>

        <div className="mb-3 me-3" key={variant.label}>
          <div className="form-check">
            {(variant.stockStatus !== "sold-out") ?
              <input className="form-check-input rounded-2" type="radio" name="flexRadioDefault" id={`input`+ sizeID + i} />
            :
              <input className="form-check-input rounded-2" disabled type="radio" name="flexRadioDefault" id={`input`+ sizeID + i} />
            }
            <label className="cursor-pointer" htmlFor={`input`+ sizeID + i}>
              {variant.label} – ${variant.price.toLocaleString()}
            </label>
          </div>
        </div>

        ) : Object.entries(sizes ?? {}).map(([size, amount], i) =>

        <div className="mb-3 me-3">
          <div className="form-check">
            {(amount != 0) ?
              <input className="form-check-input rounded-2" type="radio" name="flexRadioDefault" id={`input`+ sizeID + i} />
            :
              <input className="form-check-input rounded-2" disabled type="radio" name="flexRadioDefault" id={`input`+ sizeID + i} />
            }
            <label className="cursor-pointer" htmlFor={`input`+ sizeID + i}>{size}</label>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
