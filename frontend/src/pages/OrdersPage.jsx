import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import OrderActions from '../components/OrderActions.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FALLBACK_IMAGE, money, shortDate } from '../utils/format.js';

export const STEPS = ['PLACED', 'SHIPPED', 'DELIVERED'];
export const STEP_LABEL = {
  PLACED: 'Order Placed', SHIPPED: 'Shipped', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled', RETURN_REQUESTED: 'Return Requested', RETURN_APPROVED: 'Return Approved',
  RETURN_REJECTED: 'Return Rejected', REFUNDED: 'Refunded',
};

/** Loads the signed-in shopper's orders + catalogue and refreshes them quietly (the admin moves orders forward). */
export function useMyOrders() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', orders: [], products: {} });

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    Promise.all([api.myOrders(), api.products()])
      .then(([orders, products]) => {
        if (!cancelled) setState({ loading: false, error: '', orders, products: Object.fromEntries(products.map((p) => [p.id, p])) });
      })
      .catch((e) => { if (!cancelled) setState({ loading: false, error: e.message, orders: [], products: {} }); });
    const refresh = () => api.myOrders().then((orders) => { if (!cancelled) setState((s) => ({ ...s, orders })); }).catch(() => {});
    const timer = setInterval(refresh, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Re-fetch the orders right now (used after cancelling / returning). */
  const reload = useCallback(
    () => api.myOrders().then((orders) => setState((s) => ({ ...s, orders }))).catch(() => {}),
    [],
  );
  return { ...state, reload };
}

export function LoginNeeded({ title }) {
  const { openAuth } = useAuth();
  return (
    <section className="se-page narrow">
      <div className="se-empty">
        <Icon name="user" size={44} />
        <h2>{title}</h2>
        <p>Please log in to continue.</p>
        <button className="se-btn primary" onClick={() => openAuth('login')}>Login</button>
      </div>
    </section>
  );
}

/** Merge lines of the same product + size + colour. */
export const mergeLines = (order) => {
  const merged = new Map();
  order.items.forEach((i) => {
    const key = [i.productId, i.size || '', i.color || ''].join('|');
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + i.quantity } : { ...i });
  });
  return [...merged.values()];
};

export default function OrdersPage() {
  const { user } = useAuth();
  const { loading, error, orders, products, reload } = useMyOrders();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  if (!user) return <LoginNeeded title="My Orders" />;

  return (
    <section className="se-page">
      <h1 className="se-title">My Orders <small>({orders.length})</small></h1>
      {loading && <div className="se-skeleton tall" />}
      {error && <div className="se-empty"><h2>Could not load your orders</h2><small>{error}</small></div>}
      {!loading && !error && orders.length === 0 && (
        <div className="se-empty"><Icon name="box" size={44} /><h2>No orders yet</h2><p>Orders you place while logged in show up here.</p><a className="se-btn primary" href="#/products">Start shopping</a></div>
      )}
      {!loading && !error && orders.map((o) => <OrderCard key={o.id} order={o} products={products} onChanged={reload} />)}
    </section>
  );
}

function OrderCard({ order, products, onChanged }) {
  const { add, openDrawer, productQty } = useCart();
  const toast = useToast();
  const lines = useMemo(() => mergeLines(order), [order]);
  const delivered = order.status === 'DELIVERED';

  /** Put every item of this order back in the cart - using today's price / stock, skipping what is gone. */
  function buyAgain() {
    const addedByProduct = {};
    let added = 0;
    const skipped = [];
    lines.forEach((line) => {
      const product = products[line.productId];
      if (!product || product.stock < 1) { skipped.push(line.productName); return; }
      const sizeOk = !line.size || (product.sizes || []).some((s) => s.toLowerCase() === line.size.toLowerCase());
      const colorOk = !line.color || (product.colors || []).some((c) => c.name.toLowerCase() === line.color.toLowerCase());
      if (!sizeOk || !colorOk) { skipped.push(line.productName); return; }
      const room = product.stock - productQty(product.id) - (addedByProduct[product.id] || 0);
      const quantity = Math.min(line.quantity, room);
      if (quantity < 1) { skipped.push(line.productName); return; }
      if (add(product, { size: line.size || '', color: line.color || '', quantity, silent: true })) {
        addedByProduct[product.id] = (addedByProduct[product.id] || 0) + quantity;
        added += 1;
        if (quantity < line.quantity) skipped.push(`${line.productName} (only ${quantity} available)`);
      }
    });
    if (added > 0) openDrawer();
    if (skipped.length > 0) toast(`Not fully available: ${skipped.join(', ')}`);
    else if (added > 0) toast('Items added to your cart');
  }

  return (
    <article className="se-order">
      <header>
        <div><span>Order ID</span><b>#{order.id}</b></div>
        <div><span>Placed on</span><b>{shortDate(order.createdAt)}</b></div>
        <div><span>Total</span><b>{money(order.total)}</b></div>
        <div className="grow"><span>Status</span><b className={`se-status ${order.status.toLowerCase()}`}>{STEP_LABEL[order.status] || order.status}</b></div>
        <a className="se-btn primary" href={`#/track/${order.id}`}>Track Order</a>
      </header>
      <div className="se-order-lines">
        {lines.map((line, index) => {
          const product = products[line.productId];
          const firstOfProduct = lines.findIndex((l) => l.productId === line.productId) === index;
          return (
            <div className="se-order-line" key={[line.productId, line.size, line.color].join('|')}>
              <img src={product?.imageUrl || FALLBACK_IMAGE} alt={line.productName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} />
              <div>
                {product ? <a href={`#/product/${product.id}`}>{line.productName}</a> : <span>{line.productName} <small>(no longer sold)</small></span>}
                <small>{[line.color && `Color: ${line.color}`, line.size && `Size: ${line.size}`, `Qty ${line.quantity} × ${money(line.unitPrice)}`].filter(Boolean).join(' · ')}</small>
                {delivered && product && firstOfProduct && <a className="se-link" href={`#/product/${product.id}/reviews`}>★ Write a product review</a>}
              </div>
              <b>{money(line.unitPrice * line.quantity)}</b>
            </div>
          );
        })}
      </div>
      <footer><button className="se-btn ghost" onClick={buyAgain}>↻ Buy again</button><OrderActions order={order} onChanged={onChanged} /></footer>
    </article>
  );
}
