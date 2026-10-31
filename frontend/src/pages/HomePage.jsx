import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon, { categoryIcon } from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { FALLBACK_IMAGE, discountPercent } from '../utils/format.js';

export default function HomePage() {
  const { add, ordersPlaced } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.products(), api.categories()])
      .then(([p, c]) => { if (!cancelled) { setProducts(p); setCategories(c); setStatus({ loading: false, error: '' }); } })
      .catch((e) => { if (!cancelled) setStatus({ loading: false, error: e.message }); });
    return () => { cancelled = true; };
  }, [ordersPlaced]);

  // Trending = most reviewed, then best rated, then newest. Deals = biggest discount first.
  const trending = useMemo(() => [...products].sort((a, b) =>
    (b.ratingCount || 0) - (a.ratingCount || 0) || (b.rating || 0) - (a.rating || 0) || b.id - a.id).slice(0, 4), [products]);
  const deals = useMemo(() => [...products].filter((p) => discountPercent(p) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a)).slice(0, 8), [products]);
  const maxOff = deals.length ? discountPercent(deals[0]) : 0;
  const heroImages = (deals.length ? deals : products).slice(0, 3);

  if (status.error) {
    return (
      <section className="se-page">
        <div className="se-empty">
          <Icon name="box" size={40} />
          <h2>Could not load products</h2>
          <p>Check that the Spring Boot server is running on port 8080.</p>
          <small>{status.error}</small>
        </div>
      </section>
    );
  }

  return (
    <section className="se-page">
      {/* ---------- hero ---------- */}
      <div className="se-hero">
        <div className="se-hero-copy">
          <h1>Big Deals<br />Bigger Smiles</h1>
          <p>Top Brands <i>|</i> Best Prices <i>|</i> Fast Delivery</p>
          <a className="se-btn primary hero-btn" href="#/products">Shop Now <Icon name="arrowRight" size={16} /></a>
        </div>
        <div className="se-hero-art" aria-hidden="true">
          {heroImages.map((p, i) => (
            <img
              key={p.id}
              className={`h${i}`}
              src={p.imageUrl}
              alt=""
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
            />
          ))}
        </div>
      </div>

      {/* ---------- categories ---------- */}
      <div className="se-cats" role="list">
        {categories.slice(0, 7).map((c) => (
          <a role="listitem" key={c} className="se-cat" href={`#/products?category=${encodeURIComponent(c)}`}>
            <span><Icon name={categoryIcon(c)} size={26} /></span>
            {c}
          </a>
        ))}
        <a role="listitem" className="se-cat" href="#/products">
          <span><Icon name="grid" size={26} /></span>
          More
        </a>
      </div>

      {/* ---------- trending ---------- */}
      <div className="se-section-head">
        <h2>Trending Now</h2>
        <a href="#/products">View All <Icon name="chevronRight" size={14} /></a>
      </div>
      {status.loading
        ? <div className="se-grid four">{[0, 1, 2, 3].map((i) => <div key={i} className="se-skeleton" />)}</div>
        : (
          <div className="se-grid four">
            {trending.map((p) => <ProductCard key={p.id} product={p} onAdd={add} compact />)}
          </div>
        )}

      {/* ---------- promo ---------- */}
      {maxOff > 0 && (
        <div className="se-promo">
          <div className="se-promo-icon"><Icon name="zap" size={30} /></div>
          <div>
            <b>Save up to {maxOff}% on selected products</b>
            <span>Prices already marked down - no coupon needed</span>
          </div>
          <a className="se-btn accent" href="#/products?sort=discount">Shop Now</a>
        </div>
      )}

      {/* ---------- best deals ---------- */}
      {deals.length > 0 && (
        <>
          <div className="se-section-head">
            <h2>Best Deals For You</h2>
            <a href="#/products?sort=discount">View All <Icon name="chevronRight" size={14} /></a>
          </div>
          <div className="se-grid four">
            {deals.map((p) => <ProductCard key={p.id} product={p} onAdd={add} />)}
          </div>
        </>
      )}
    </section>
  );
}
