interface Props {
  thumb_src: string;
  title: string;
  href?: string;
  price: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export default function CartItem({
  thumb_src,
  title,
  href,
  price,
  quantity,
  onQuantityChange,
  onRemove,
}: Props) {

  return (
    <>
      <div className="d-block d-md-flex">
        <a href={href ?? '#'} className="d-flex text-dark text-decoration-none">
          <img className="w-50 w-md-30 rounded-3" src={thumb_src} alt={title} />
          <div className="w-100 w-md-50 ps-md-4">
            <h6 className="text-lg mb-1">{title}</h6>
            <p className="mb-0 text-sm">${price.toLocaleString()} each</p>
          </div>
        </a>
        <div className="w-20 w-md-10 mt-4 mt-md-0">
          <input
            type="number"
            min={1}
            className="form-control"
            value={quantity}
            onChange={e => onQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
            aria-label="quantity"
          />
        </div>
        <h4 className="ms-3">${(price * quantity).toLocaleString()}</h4>

        <div className="w-10 text-end">
          <a href="#" onClick={e => { e.preventDefault(); onRemove(); }} aria-label="Remove item">
            <i className="bi bi-x-lg ms-3"></i>
          </a>
        </div>
      </div>
    </>
  );
}
