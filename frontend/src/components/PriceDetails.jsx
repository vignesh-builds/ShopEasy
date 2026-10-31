import { money, mrpOf } from '../utils/format.js';

/** Price breakdown box (cart page + checkout side panel). `entries` = cart lines. */
export default function PriceDetails({ entries, children }) {
  const totalMrp = entries.reduce((n, e) => n + mrpOf(e.product) * e.quantity, 0);
  const total = entries.reduce((n, e) => n + e.product.price * e.quantity, 0);
  const discount = totalMrp - total;
  const items = entries.reduce((n, e) => n + e.quantity, 0);
  return (
    <aside className="se-summary" aria-label="Price details">
      <h2>Price Details</h2>
      <dl>
        <div><dt>Total MRP ({items} item{items === 1 ? '' : 's'})</dt><dd>{money(totalMrp)}</dd></div>
        {discount > 0 && <div><dt>Discount</dt><dd className="green">-{money(discount)}</dd></div>}
        <div><dt>Delivery Charges</dt><dd className="green">FREE</dd></div>
      </dl>
      <div className="se-summary-total"><span>Total Amount</span><b>{money(total)}</b></div>
      {discount > 0 && <p className="se-savings">You will save {money(discount)} on this order</p>}
      {children}
    </aside>
  );
}
