import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { getViewed, rememberViewed } from '../utils/recentlyViewed.js';
import ProductCard from './ProductCard.jsx';

// Shown under the product details:
//   "Customers also bought"  - products that were ordered together with this one (appears once there are orders)
//   "You may also like"      - similar products (same category / brand / price), topped up with popular ones
//   "Recently viewed"        - what this shopper looked at before (kept in the browser)
export default function Recommendations({ product }) {
  const [state, setState] = useState({ loading: true, alsoBought: [], similar: [] });
  const [recentIds, setRecentIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, alsoBought: [], similar: [] });

    api.recommendations(product.id)
      .then((r) => { if (!cancelled) setState({ loading: false, alsoBought: r.alsoBought || [], similar: r.similar || [] }); })
      .catch(() => {
        // Older backend without the recommendations route: fall back to "other products".
        api.products()
          .then((all) => {
            if (cancelled) return;
            const same = all.filter((p) => p.id !== product.id && p.category === product.category);
            const rest = all.filter((p) => p.id !== product.id && p.category !== product.category);
            setState({ loading: false, alsoBought: [], similar: [...same, ...rest].slice(0, 8) });
          })
          .catch(() => { if (!cancelled) setState({ loading: false, alsoBought: [], similar: [] }); });
      });

    return () => { cancelled = true; };
  }, [product.id, product.category]);

  // Remember this product for "Recently viewed" (after reading what was viewed before it).
  useEffect(() => {
    setRecentIds(getViewed().filter((id) => id !== product.id));
    rememberViewed(product.id);
  }, [product.id]);

  return (
    <div className="reco">
      {state.loading && <RecoSkeleton />}
      {!state.loading && state.alsoBought.length > 0 && (
        <RecoRow title="Customers also bought" subtitle="Other shoppers ordered these together with this item" items={state.alsoBought} />
      )}
      {!state.loading && state.similar.length > 0 && (
        <RecoRow title="You may also like" subtitle="Similar picks from the store" items={state.similar} />
      )}
      <RecentlyViewed ids={recentIds} />
    </div>
  );
}

function RecoRow({ title, subtitle, items }) {
  const { add } = useCart();
  const rail = useRef(null);

  const scroll = (direction) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="reco-block" aria-label={title}>
      <div className="reco-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted reco-sub">{subtitle}</p>}
        </div>
        {items.length > 3 && (
          <div className="reco-arrows">
            <button type="button" aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)}>‹</button>
            <button type="button" aria-label={`Scroll ${title} right`} onClick={() => scroll(1)}>›</button>
          </div>
        )}
      </div>
      <div className="reco-rail" ref={rail}>
        {items.map((p) => (
          <div className="reco-item" key={p.id}>
            <ProductCard product={p} onAdd={add} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentlyViewed({ ids }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); return undefined; }
    let cancelled = false;
    api.products()
      .then((all) => {
        if (cancelled) return;
        const byId = new Map(all.map((p) => [p.id, p]));
        setProducts(ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 8));   // deleted products drop out
      })
      .catch(() => { if (!cancelled) setProducts([]); });
    return () => { cancelled = true; };
  }, [ids]);

  if (products.length === 0) return null;
  return <RecoRow title="Recently viewed" items={products} />;
}

function RecoSkeleton() {
  return (
    <section className="reco-block" aria-hidden="true">
      <div className="reco-head"><h2>You may also like</h2></div>
      <div className="reco-rail">
        {[0, 1, 2, 3].map((i) => <div className="reco-item reco-skeleton" key={i} />)}
      </div>
    </section>
  );
}
