import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import ProductCartItem from './productCartItem';
import CardProduct from '../products/cardProduct';
import { cartStore, removeFromCart, setQuantity, getSubtotal, getItemCount } from '../../lib/cart';

const RECOMMENDATION_LIMIT = 4;

interface IndexedVariant {
  sku: string;
  label: string;
  price: number;
  stockStatus: "in-stock" | "low-stock" | "sold-out" | "pre-order";
  quantityAvailable?: number;
}

interface IndexedProduct {
  kind: 'plants' | 'supplies';
  id: string;
  title: string;
  genus?: string;
  tags: string[];
  images: string[];
  variants: IndexedVariant[];
  relatedProducts: { kind: 'plants' | 'supplies'; id: string }[];
}

export default function ShoppingCart() {
  const cart = useStore(cartStore);
  const items = Object.values(cart);
  const subtotal = getSubtotal(cart);
  const itemCount = getItemCount(cart);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [recommendations, setRecommendations] = useState<IndexedProduct[]>([]);
  const skuKey = items.map(i => i.sku).sort().join(',');

  useEffect(() => {
    if (!mounted || items.length === 0) {
      setRecommendations([]);
      return;
    }

    fetch(`${import.meta.env.BASE_URL}/product-index.json`)
      .then(res => res.json())
      .then((products: IndexedProduct[]) => {
        const skuToProduct = new Map<string, IndexedProduct>();
        const idToProduct = new Map<string, IndexedProduct>();
        for (const p of products) {
          idToProduct.set(`${p.kind}:${p.id}`, p);
          for (const v of p.variants) {
            skuToProduct.set(v.sku, p);
          }
        }

        const inCart = new Set<string>();
        for (const item of items) {
          const product = skuToProduct.get(item.sku);
          if (product) inCart.add(`${product.kind}:${product.id}`);
        }

        const recommended = new Map<string, IndexedProduct>();
        for (const item of items) {
          const product = skuToProduct.get(item.sku);
          if (!product) continue;
          for (const rel of product.relatedProducts) {
            const key = `${rel.kind}:${rel.id}`;
            if (inCart.has(key) || recommended.has(key)) continue;
            const relProduct = idToProduct.get(key);
            if (relProduct) recommended.set(key, relProduct);
          }
        }

        setRecommendations(Array.from(recommended.values()).slice(0, RECOMMENDATION_LIMIT));
      });
  }, [mounted, skuKey]);

  return (
    <>
      <div className="container mt-5">
        <h2 className="mb-3 text-center">Shopping Cart</h2>

        {!mounted &&
          <p className="text-center">Loading your cart…</p>
        }

        {(mounted && items.length === 0) &&
          <p className="text-center">
            Your cart is empty. <a href={`${import.meta.env.BASE_URL}/`} className="font-weight-bold text-decoration-underline">Continue shopping</a>.
          </p>
        }

        {(mounted && items.length > 0) &&
          <div className="row">
            <div className="col-12 col-lg-7">
              {items.map((item, i) =>
                <div key={item.sku}>
                  {i != 0 &&
                    <hr className="horizontal dark my-4" />
                  }
                  <ProductCartItem
                    thumb_src={item.thumb_src}
                    title={item.title}
                    href={item.href}
                    price={item.price}
                    quantity={item.quantity}
                    onQuantityChange={qty => setQuantity(item.sku, qty)}
                    onRemove={() => removeFromCart(item.sku)}
                  />
                </div>
              )}
            </div>
            <div className="col-12 col-lg-5 mt-5 mt-lg-0">
              <div className="card shadow-xs border bg-gray-100">
                <div className="card-body p-lg-5">
                  <h5 className="mb-4">Order Summary</h5>
                  <ul className="list-unstyled">
                    <li className="mt-2">
                      <div className="d-flex justify-content-between">
                        <p className="opacity-8">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</p>
                        <p className="fw-bold opacity-8">${subtotal.toLocaleString()}</p>
                      </div>
                    </li>
                  </ul>
                  <button className="btn btn-dark btn-lg w-100" disabled title="Checkout is not wired up yet">Checkout</button>
                  <a href={`${import.meta.env.BASE_URL}/`} className="btn btn-white btn-lg w-100">Continue Shopping</a>
                  <p className="text-center">Tax included. Shipping calculated at checkout.</p>
                </div>
              </div>
            </div>
          </div>
        }

        {(mounted && recommendations.length > 0) &&
          <div className="row mt-10">
            <h5 className="mb-4">You might also like</h5>
            {recommendations.map(item =>
              <div className="col-md-6 col-lg-3" key={`${item.kind}:${item.id}`}>
                <CardProduct
                  thumb_src={item.images[0] ?? ''}
                  thumb_alt={item.title}
                  title={item.title}
                  genus={item.genus}
                  tags={item.tags}
                  variants={item.variants}
                  position="left"
                  href={`${import.meta.env.BASE_URL}/${item.kind}/${item.id}/`}
                />
              </div>
            )}
          </div>
        }
      </div>
    </>
  );
};
