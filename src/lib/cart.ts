import { persistentAtom } from '@nanostores/persistent';

export interface CartItem {
  sku: string;
  title: string;
  price: number;
  thumb_src: string;
  href: string;
  quantity: number;
}

export type CartState = Record<string, CartItem>;

export const cartStore = persistentAtom<CartState>('cart', {}, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity: number = 1) {
  const cart = cartStore.get();
  const existing = cart[item.sku];
  cartStore.set({
    ...cart,
    [item.sku]: {
      ...item,
      quantity: (existing?.quantity ?? 0) + quantity,
    },
  });
}

export function removeFromCart(sku: string) {
  const cart = { ...cartStore.get() };
  delete cart[sku];
  cartStore.set(cart);
}

export function setQuantity(sku: string, quantity: number) {
  const cart = cartStore.get();
  const existing = cart[sku];
  if (!existing) return;
  if (quantity <= 0) {
    removeFromCart(sku);
    return;
  }
  cartStore.set({
    ...cart,
    [sku]: { ...existing, quantity },
  });
}

export function getSubtotal(cart: CartState): number {
  return Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getItemCount(cart: CartState): number {
  return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
}
