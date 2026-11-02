import { useEffect, useMemo } from 'react';
import Icon from '../components/Icon.jsx';
import OrderActions from '../components/OrderActions.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { FALLBACK_IMAGE, money, shortDate } from '../utils/format.js';
import { LoginNeeded, STEPS, STEP_LABEL, mergeLines, useMyOrders } from './OrdersPage.jsx';

const MESSAGE = {
  PLACED: ['Your order is confirmed', 'We have received your order and the store is getting it ready.'],
  SHIPPED: ['Your order is on the way', 'Your package has been shipped and is heading to you.'],
  DELIVERED: ['Your order was delivered', 'We hope you love it. You can review the products, or return them within 7 days.'],
  CANCELLED: ['Your order was cancelled', 'This order will not be shipped. The items went back into stock.'],
  RETURN_REQUESTED: ['Return request received', 'We are reviewing your return request and will email you the decision.'],
  RETURN_APPROVED: ['Return approved', 'Your return was approved and the refund is being processed.'],
  RETURN_REJECTED: ['Return request declined', 'We could not approve this return. Contact support if you have questions.'],
  REFUNDED: ['Refund issued', 'Your refund has been issued for this order.'],
};
const BANNER = { CANCELLED: 'cancelled', RETURN_REQUESTED: 'pending', RETURN_APPROVED: 'pending', RETURN_REJECTED: 'cancelled', REFUNDED: 'refunded' };

export default function TrackPage({ orderId }) {
  const { user } = useAuth();
  const { loading, error, orders, products, reload } = useMyOrders();
  useEffect(() => { window.scrollTo(0, 0); }, [orderId]);
  const order = orders.find((o) => o.id === orderId);
  const lines = useMemo(() => (order ? mergeLines(order) : []), [order]);

  if (!user) return <LoginNeeded title="Track Order" />;
  if (loading) return <section className="se-page narrow"><div className="se-skeleton tall" /></section>;
  if (error || !order) {
    return (
      <section className="se-page narrow">
        <div className="se-empty"><Icon name="box" size={44} /><h2>{error ? 'Could not load this order' : 'Order not found'}</h2><p>Only orders placed while logged in to this account can be tracked.</p><a className="se-btn primary" href="#/orders">My Orders</a></div>
      </section>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  const step = STEPS.includes(order.status) ? STEPS.indexOf(order.status) : STEPS.length - 1;   // returns happen after delivery
  const [headline, sub] = MESSAGE[order.status] || MESSAGE.PLACED;

  return (
    <section className="se-page narrow">
      <nav className="se-crumbs"><a href="#/orders">My Orders</a><Icon name="chevronRight" size={12} /><b>Track Order</b></nav>
      <div className="se-track">
        <h1>Track Your Order</h1>
        <p className="se-muted">Order ID: <b>#{order.id}</b> · Placed on: {shortDate(order.createdAt)}</p>

        {!cancelled && <ol className="se-timeline" aria-label={`Order status: ${STEP_LABEL[order.status] || order.status}`}>
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>
              <span>{i <= step ? <Icon name="check" size={14} stroke={3} /> : ''}</span>
              <b>{STEP_LABEL[s]}</b>
            </li>
          ))}
        </ol>}

        <div className={`se-status-banner ${BANNER[order.status] || ''}`}>
          <span><Icon name={order.status === 'SHIPPED' || order.status === 'PLACED' ? 'truck' : cancelled ? 'close' : order.status === 'DELIVERED' || order.status === 'REFUNDED' ? 'check' : 'returnBox'} size={26} /></span>
          <div><b>{headline}</b><p>{sub}</p></div>
        </div>

        <h2 className="se-h2">Items in this Order</h2>
        <div className="se-track-items">
          {lines.map((line) => {
            const p = products[line.productId];
            return (
              <a key={[line.productId, line.size, line.color].join('|')} className="se-track-item" href={p ? `#/product/${p.id}` : undefined}>
                <img src={p?.imageUrl || FALLBACK_IMAGE} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} />
                <div><b>{line.productName}</b><small>{[line.color && `Color: ${line.color}`, line.size && `Size: ${line.size}`, `Qty: ${line.quantity}`].filter(Boolean).join(' · ')}</small></div>
                <b>{money(line.unitPrice * line.quantity)}</b>
              </a>
            );
          })}
        </div>

        <div className="se-order se-track-actions" style={{ border: 0, boxShadow: 'none', background: 'transparent' }}>
          <footer style={{ padding: '14px 0', background: 'transparent', border: 0 }}><OrderActions order={order} onChanged={reload} /></footer>
        </div>

        <div className="se-track-foot">
          <div><h4>Delivery address</h4><p><b>{order.customerName}</b><br />{order.address}</p></div>
          <div><h4>Order total</h4><p className="se-big">{money(order.total)}</p></div>
        </div>
      </div>
    </section>
  );
}
