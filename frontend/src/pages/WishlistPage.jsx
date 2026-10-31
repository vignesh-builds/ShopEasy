import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { FALLBACK_IMAGE, discountPercent, money } from '../utils/format.js';

export default function WishlistPage() {
  const { user, openAuth } = useAuth();
  const { add } = useCart();
  const { ids, toggle } = useWishlist();
  const [state, setState] = useState({ loading: true, error: '', products: [] });

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    let cancelled = false;
    api.products()
      .then((products) => { if (!cancelled) setState({ loading: false, error: '', products }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, error: e.message, products: [] }); });
    return () => { cancelled = true; };
  }, []);

  const byId = Object.fromEntries(state.products.map((p) => [p.id, p]));
  const saved = ids.map((id) => byId[id]).filter(Boolean);

  return (
    <section className="se-page narrow">
      <h1 className="se-title">My Wishlist <small>({saved.length})</small></h1>
      {!user && (
        <p className="se-note">Saved on this device only. <button className="se-link" onClick={() => openAuth('login')}>Log in</button> to keep it in your account.</p>
      )}
      {state.loading && <div className="se-skeleton tall" />}
      {state.error && <div className="se-empty"><h2>Could not load products</h2><small>{state.error}</small></div>}
      {!state.loading && !state.error && saved.length === 0 && (
        <div className="se-empty"><Icon name="heart" size={44} /><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it here.</p><a className="se-btn primary" href="#/products">Browse products</a></div>
      )}
      <div className="se-wish-list">
        {saved.map((p) => {
          const off = discountPercent(p);
          const soldOut = p.stock < 1;
          return (
            <article className="se-wish-row" key={p.id}>
              <a href={`#/product/${p.id}`}><img src={p.imageUrl} alt={p.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} /></a>
              <div className="se-wish-info">
                <h3><a href={`#/product/${p.id}`}>{p.name}</a></h3>
                <p className="se-muted">{[p.brand, p.category].filter(Boolean).join(' · ')}</p>
                <p className="se-price-row"><b>{money(p.price)}</b>{off > 0 && <s>{money(p.mrp)}</s>}{off > 0 && <span className="se-off">{off}% off</span>}</p>
              </div>
              <div className="se-wish-actions">
                <button className="se-iconlink saved" aria-label={`Remove ${p.name} from wishlist`} onClick={() => toggle(p.id)}><Icon name="heart" size={20} fill="currentColor" /></button>
                <button className="se-btn primary" disabled={soldOut} onClick={() => add(p, { color: p.colors?.[0]?.name || '', size: p.sizes?.[0] || '' })}>
                  {soldOut ? 'Out of stock' : 'Add to Cart'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
