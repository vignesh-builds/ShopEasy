import { useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import PriceDetails from '../components/PriceDetails.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { FALLBACK_IMAGE, money } from '../utils/format.js';

export default function CartPage() {
  const { entries, count, changeQuantity, remove, openCheckout, productQty } = useCart();
  const { has, toggle } = useWishlist();
  const { isAdmin } = useAuth();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (isAdmin) {
    return (
      <section className="se-page narrow">
        <div className="se-empty"><Icon name="cart" size={40} /><h2>Admins do not shop</h2><p>Use the dashboard to manage products and orders.</p><a className="se-btn primary" href="#/admin">Open dashboard</a></div>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="se-page narrow">
        <div className="se-empty">
          <Icon name="cart" size={44} />
          <h2>Your cart is empty</h2>
          <p>Looks like you have not added anything yet.</p>
          <a className="se-btn primary" href="#/products">Continue Shopping</a>
        </div>
      </section>
    );
  }

  return (
    <section className="se-page">
      <h1 className="se-title">My Cart <small>({count} item{count === 1 ? '' : 's'})</small>
        <a className="se-link right" href="#/products">Continue Shopping</a>
      </h1>

      <div className="se-two">
        <div className="se-cart-list">
          {entries.map((line) => {
            const { key, product: p, quantity: q, size, color } = line;
            return (
              <article className="se-cart-line" key={key}>
                <a className="se-cart-img" href={`#/product/${p.id}`}>
                  <img src={p.imageUrl} alt={p.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} />
                </a>
                <div className="se-cart-info">
                  <h3><a href={`#/product/${p.id}`}>{p.name}</a></h3>
                  <p className="se-muted">{[p.brand, color && `Color: ${color}`, size && `Size: ${size}`].filter(Boolean).join(' · ')}</p>
                  <p className="se-price-row"><b>{money(p.price * q)}</b>{p.mrp > p.price && <s>{money(p.mrp * q)}</s>}</p>
                  <div className="se-stepper">
                    <button aria-label="Decrease quantity" onClick={() => (q === 1 ? remove(key) : changeQuantity(line, -1))}><Icon name="minus" size={14} /></button>
                    <span>{q}</span>
                    <button aria-label="Increase quantity" disabled={productQty(p.id) >= p.stock} onClick={() => changeQuantity(line, 1)}><Icon name="plus" size={14} /></button>
                  </div>
                </div>
                <div className="se-cart-side">
                  <button className={`se-iconlink ${has(p.id) ? 'saved' : ''}`} aria-label={has(p.id) ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => toggle(p.id)}>
                    <Icon name="heart" size={18} fill={has(p.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button className="se-iconlink" aria-label={`Remove ${p.name}`} onClick={() => remove(key)}><Icon name="trash" size={18} /></button>
                </div>
              </article>
            );
          })}
        </div>

        <PriceDetails entries={entries}>
          <button className="se-btn primary block lg" onClick={openCheckout}>Proceed to Checkout <Icon name="arrowRight" size={16} /></button>
          <p className="se-secure"><Icon name="lock" size={14} /> Safe and secure checkout</p>
        </PriceDetails>
      </div>
    </section>
  );
}
