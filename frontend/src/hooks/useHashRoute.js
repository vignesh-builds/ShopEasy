import { useEffect, useState } from 'react';

// Tiny hash router (no extra dependency). Routes:
//   "#/"                      home
//   "#/products?q=&category=&sort="  product listing (search + filters)
//   "#/product/12"            product details ("#/product/12/reviews" opens the Reviews tab)
//   "#/cart"                  cart page
//   "#/login?mode=register"   login / sign up page (mode: login | register | forgot)
//   "#/checkout"              checkout (delivery -> payment -> review)
//   "#/orders"                my orders
//   "#/track/12"              order tracking
//   "#/account?tab=addresses" profile page
//   "#/wishlist"              saved products
//   "#/admin", "#/admin/orders"  admin
//   "#/verify-email?token=", "#/reset-password?token="  links from e-mails
const currentRoute = () => {
  const path = window.location.hash.replace(/^#/, '').split('?')[0];
  if (path.startsWith('/admin/orders')) return '/admin/orders';
  if (path.startsWith('/admin')) return '/admin';
  if (path.startsWith('/orders')) return '/orders';
  if (path.startsWith('/wishlist')) return '/wishlist';
  if (path.startsWith('/verify-email')) return '/verify-email';
  if (path.startsWith('/reset-password')) return '/reset-password';
  if (path.startsWith('/products')) return '/products';
  if (path.startsWith('/cart')) return '/cart';
  if (path.startsWith('/login')) return '/login';
  if (path.startsWith('/checkout')) return '/checkout';
  if (path.startsWith('/account')) return '/account';
  const track = path.match(/^\/track\/(\d+)/);
  if (track) return `/track/${track[1]}`;
  const product = path.match(/^\/product\/(\d+)/);
  return product ? `/product/${product[1]}` : '/';
};

export function useHashRoute() {
  const [route, setRoute] = useState(currentRoute);
  const [, setTick] = useState(0);              // also re-render when only the ?query part changes
  useEffect(() => {
    const onChange = () => { setRoute(currentRoute()); setTick((n) => n + 1); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Reads ?name=value from the hash, e.g. "#/reset-password?token=abc" -> hashParam('token') === 'abc'. */
export function hashParam(name) {
  const query = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get(name) || '';
}

/** Navigate to a hash route, e.g. go('/products', { category: 'Fashion' }). */
export function go(path, params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v) qs.set(k, v); });
  const s = qs.toString();
  window.location.hash = `#${path}${s ? `?${s}` : ''}`;
}
