const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const money = (n) => inr.format(n);

export const FALLBACK_IMAGE = 'https://placehold.co/600x650/f0f1eb/294b38?text=ShopEasy';

/** Percentage off, or 0 when there is no (higher) MRP. */
export const discountPercent = (product) =>
  product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

/** Main image first, then the gallery images (duplicates removed). */
export const galleryImages = (product) =>
  [...new Set([product.imageUrl, ...(product.images || [])].filter(Boolean))];

/** True when the shopper must pick a size and/or colour before adding to the bag. */
export const hasOptions = (product) => (product.sizes?.length || 0) > 0 || (product.colors?.length || 0) > 0;

/** "Thu, 30 Oct" style delivery date, `days` from today. */
export const deliveryDate = (days) =>
  new Date(Date.now() + days * 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Cart line identity: the same product in a different size / colour is a separate line. */
export const lineKey = (productId, size, color) => [productId, size || '', color || ''].join('|');

/** Total MRP of cart lines (falls back to the selling price when a product has no MRP). */
export const mrpOf = (product) => (product.mrp && product.mrp > product.price ? product.mrp : product.price);

/** "28 Oct 2025" */
export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** 12400 -> "12.4k" (used for rating counts on cards). */
export const compactCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
