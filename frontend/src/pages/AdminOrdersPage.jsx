import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { hashParam } from '../hooks/useHashRoute.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FALLBACK_IMAGE, money } from '../utils/format.js';

const STEPS = ['PLACED', 'SHIPPED', 'DELIVERED'];
const STEP_LABEL = {
  PLACED: 'Order placed', SHIPPED: 'Shipped', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled by customer', RETURN_REQUESTED: 'Return requested', RETURN_APPROVED: 'Return approved',
  RETURN_REJECTED: 'Return rejected', REFUNDED: 'Refunded',
};
const PILL = { CANCELLED: 'red', RETURN_REQUESTED: 'amber', RETURN_APPROVED: 'amber', RETURN_REJECTED: 'red', REFUNDED: 'green' };
const NEXT_STATUS = { PLACED: 'SHIPPED', SHIPPED: 'DELIVERED' };
const NEXT_LABEL = { PLACED: 'Mark as shipped', SHIPPED: 'Mark as delivered' };

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'active', label: 'In progress', test: (o) => ['PLACED', 'SHIPPED'].includes(o.status) },
  { id: 'returns', label: 'Returns & refunds', test: (o) => ['RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REFUNDED'].includes(o.status) },
  { id: 'cancelled', label: 'Cancelled', test: (o) => o.status === 'CANCELLED' },
];

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Admin: every customer's orders, with the button that moves an order PLACED -> SHIPPED -> DELIVERED. */
export default function AdminOrdersPage() {
  const { isAdmin, openAuth } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: '', orders: [], products: {} });
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState(() => (FILTERS.some((f) => f.id === hashParam('filter')) ? hashParam('filter') : 'all'));

  const load = useCallback(async () => {
    try {
      const [orders, products] = await Promise.all([api.admin.orders(), api.products()]);
      setState({ loading: false, error: '', orders, products: Object.fromEntries(products.map((p) => [p.id, p])) });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  async function setStatus(order, status) {
    setBusyId(order.id);
    try {
      await api.admin.updateOrderStatus(order.id, status);
      toast(`Order #${order.id} is now ${STEP_LABEL[status]} - customer notified by email`);
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="orders-page">
        <p className="eyebrow">STORE MANAGEMENT</p>
        <h2>Orders</h2>
        <p className="muted">Please log in as admin to manage orders.</p>
        <button className="checkout-btn" style={{ maxWidth: 220 }} onClick={() => openAuth('login')}>Login →</button>
      </section>
    );
  }

  const { loading, error, orders, products } = state;
  return (
    <section className="orders-page">
      <p className="eyebrow">STORE MANAGEMENT</p>
      <h2>Orders</h2>

      {loading && <div className="loading">Loading orders…</div>}
      {error && <div className="empty">Could not load orders.<br /><small>{error}</small></div>}
      {!loading && !error && orders.length === 0 && <div className="empty">No orders yet.</div>}

      {!loading && !error && orders.length > 0 && (
        <div className="admin-tabs" role="tablist">
          {FILTERS.map((f) => {
            const n = orders.filter(f.test).length;
            const open = f.id === 'returns' ? orders.filter((o) => o.status === 'RETURN_REQUESTED').length : 0;
            return (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>
                {f.label} <small>{n}</small>{open > 0 && <b className="admin-dot" title={`${open} waiting for a decision`}>{open} new</b>}
              </button>
            );
          })}
        </div>
      )}
      {!loading && !error && orders.length > 0 && orders.filter(FILTERS.find((f) => f.id === filter).test).length === 0 && <div className="empty">No orders in this view.</div>}

      {!loading && !error && orders.filter(FILTERS.find((f) => f.id === filter).test).map((order) => {
        const step = STEPS.indexOf(order.status);
        const inFlow = step >= 0;
        const busy = busyId === order.id;
        return (
          <article className="order-card" key={order.id}>
            <header className="order-head">
              <div><span>ORDER PLACED</span><b>{fmtDate(order.createdAt)}</b></div>
              <div><span>TOTAL</span><b>{money(order.total)}</b></div>
              <div className="ship-to">
                <span>CUSTOMER</span><b>{order.customerName}</b>
                <small title={order.address}>{order.email} · {order.address}</small>
              </div>
              <div className="order-no"><span>ORDER #</span><b>{order.id}</b></div>
            </header>

            <div className="order-body">
              {!inFlow && <p><span className={`admin-pill ${PILL[order.status] || ''}`}>{STEP_LABEL[order.status] || order.status}</span></p>}
              {order.status === 'CANCELLED' && order.cancelReason && <p className="admin-return-box"><b>Cancel reason:</b> {order.cancelReason}</p>}
              {order.returnReason && <p className="admin-return-box"><b>Return reason:</b> {order.returnReason}{order.returnRequestedAt ? ` (requested ${fmtDate(order.returnRequestedAt)})` : ''}</p>}
              {inFlow && <ol className="tracker" aria-label={`Order status: ${STEP_LABEL[order.status] || order.status}`}>
                {STEPS.map((s, i) => (
                  <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''}>
                    <span className="dot">{i <= step ? '✓' : i + 1}</span>
                    <span className="step-label">{STEP_LABEL[s]}</span>
                  </li>
                ))}
              </ol>}

              <div className="order-items">
                {order.items.map((line, n) => {
                  const product = products[line.productId];
                  return (
                    <div className="order-line" key={n}>
                      <img
                        src={product?.imageUrl || FALLBACK_IMAGE}
                        alt={line.productName}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
                      />
                      <div>
                        <span className="order-product">{line.productName}</span>
                        {(line.size || line.color) && (
                          <p className="cart-variant">{[line.color && `Color: ${line.color}`, line.size && `Size: ${line.size}`].filter(Boolean).join(' · ')}</p>
                        )}
                        <p className="muted">Qty {line.quantity} × {money(line.unitPrice)}</p>
                      </div>
                      <strong>{money(line.unitPrice * line.quantity)}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="order-foot admin-actions">
                {NEXT_STATUS[order.status] && (
                  <button className="checkout-btn buy-again" disabled={busy} onClick={() => setStatus(order, NEXT_STATUS[order.status])}>
                    {busy ? 'Saving…' : NEXT_LABEL[order.status]}
                  </button>
                )}
                {order.status === 'RETURN_REQUESTED' && (
                  <>
                    <button className="checkout-btn buy-again" disabled={busy} onClick={() => setStatus(order, 'RETURN_APPROVED')}>{busy ? 'Saving…' : 'Approve return'}</button>
                    <button className="checkout-btn buy-again" style={{ background: '#fff', color: '#a3112f', border: '1px solid #f5c2cd' }} disabled={busy} onClick={() => setStatus(order, 'RETURN_REJECTED')}>Reject return</button>
                  </>
                )}
                {order.status === 'RETURN_APPROVED' && (
                  <button className="checkout-btn buy-again" disabled={busy} onClick={() => setStatus(order, 'REFUNDED')}>{busy ? 'Saving…' : `Mark refunded (${money(order.total)})`}</button>
                )}
                {order.status === 'DELIVERED' && <span className="muted">Delivered ✓ - customer can request a return for {7} days</span>}
                {['CANCELLED', 'RETURN_REJECTED', 'REFUNDED'].includes(order.status) && <span className="muted">Closed - no further changes</span>}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
