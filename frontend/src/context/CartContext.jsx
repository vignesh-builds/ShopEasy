import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { api } from '../api/client.js';
import { lineKey } from '../utils/format.js';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);

// items: { [lineKey]: { key, product, size, color, quantity } }
// One line per product + size + colour (so a size 8 and a size 9 of the same shoe are two lines).
function reducer(items, action) {
  switch (action.type) {
    case 'set': {
      const { line, quantity } = action;
      if (quantity <= 0) {
        const { [line.key]: _removed, ...rest } = items;
        return rest;
      }
      return { ...items, [line.key]: { ...line, quantity } };
    }
    case 'remove': {
      const { [action.key]: _removed, ...rest } = items;
      return rest;
    }
    case 'clear':
      return {};
    case 'load':
      return action.items;
    default:
      return items;
  }
}

// The bag is kept in this browser (localStorage), so a page refresh does not empty it.
const STORAGE_KEY = 'shopeasyCart';

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return {};
    const clean = {};
    for (const [key, line] of Object.entries(saved)) {
      if (line && line.product && Number.isInteger(line.quantity) && line.quantity > 0) clean[key] = line;
    }
    return clean;
  } catch { return {}; }
}

function refreshLines(saved, byId) {
  const left = {};      // stock still unassigned per product (all sizes/colours share it)
  const next = {};
  for (const [key, line] of Object.entries(saved)) {
    const product = byId[line.product.id];
    if (!product || product.stock < 1) continue;
    const room = left[product.id] ?? product.stock;
    const quantity = Math.min(line.quantity, room);
    if (quantity < 1) continue;
    left[product.id] = room - quantity;
    next[key] = { ...line, product, quantity };
  }
  return next;
}

export function CartProvider({ children }) {
  const toast = useToast();
  const [items, dispatch] = useReducer(reducer, undefined, loadSaved);
  const [ordersPlaced, setOrdersPlaced] = useState(0);   // storefront reloads stock when this changes

  // Save every change.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* storage blocked: bag lives in memory only */ }
  }, [items]);

  // After a refresh: bring saved lines up to date with the shop (current price / stock; drop deleted products).
  useEffect(() => {
    let cancelled = false;
    api.products().then((products) => {
      if (cancelled) return;
      const byId = Object.fromEntries(products.map((p) => [p.id, p]));
      dispatch({ type: 'load', items: refreshLines(loadSaved(), byId) });
    }).catch(() => { /* backend offline: keep the saved bag as it is */ });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => {
    const entries = Object.values(items);
    // Stock is per product, so quantities of all its sizes/colours together must stay within it.
    const productQty = (productId) =>
      entries.filter((e) => e.product.id === productId).reduce((n, e) => n + e.quantity, 0);

    return {
      entries,
      count: entries.reduce((n, e) => n + e.quantity, 0),
      total: entries.reduce((n, e) => n + e.product.price * e.quantity, 0),
      ordersPlaced,
      productQty,
      openDrawer: () => { window.location.hash = '#/cart'; },
      openCheckout: () => { window.location.hash = '#/checkout'; },

      /** Add `quantity` of a product (with the chosen size/colour). Returns true when it was added. */
      add(product, { size = '', color = '', quantity = 1, silent = false } = {}) {
        if (productQty(product.id) + quantity > product.stock) {
          toast(product.stock < 1 ? 'This item is out of stock.' : 'No more stock available for this item.');
          return false;
        }
        const key = lineKey(product.id, size, color);
        const existing = items[key]?.quantity || 0;
        dispatch({ type: 'set', line: { key, product, size, color }, quantity: existing + quantity });
        if (!silent) toast('Added to your bag');
        return true;
      },
      changeQuantity(line, delta) {
        const next = line.quantity + delta;
        if (delta > 0 && productQty(line.product.id) + delta > line.product.stock) { toast('Stock limit reached'); return; }
        dispatch({ type: 'set', line, quantity: next });
      },
      remove: (key) => dispatch({ type: 'remove', key }),
      /** Ask the storefront to reload products (stock may have changed). */
      refreshStock: () => setOrdersPlaced((n) => n + 1),
      /** Called after the backend accepted the order. */
      completeOrder() {
        dispatch({ type: 'clear' });
        setOrdersPlaced((n) => n + 1);
      },
    };
  }, [items, ordersPlaced, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
