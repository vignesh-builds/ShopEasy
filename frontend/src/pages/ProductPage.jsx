import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Recommendations from '../components/Recommendations.jsx';
import Reviews from '../components/Reviews.jsx';
import Icon from '../components/Icon.jsx';
import { StarRow } from '../components/Stars.jsx';
import WishlistButton from '../components/WishlistButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FALLBACK_IMAGE, deliveryDate, discountPercent, galleryImages, money } from '../utils/format.js';

const MAX_QTY = 10;

export default function ProductPage({ productId }) {
  const [state, setState] = useState({ loading: true, error: '', product: null });

  useEffect(() => {
    let cancelled = false;
    window.scrollTo(0, 0);
    api.product(productId)
      .then((product) => { if (!cancelled) setState({ loading: false, error: '', product }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, error: e.message, product: null }); });
    return () => { cancelled = true; };
  }, [productId]);

  if (state.loading) return <section className="se-page"><div className="se-skeleton tall" /></section>;
  if (state.error || !state.product) {
    return (
      <section className="se-page">
        <div className="se-empty">
          <Icon name="box" size={40} />
          <h2>{state.error || 'Product not found.'}</h2>
          <a className="se-btn primary" href="#/products">Back to shop</a>
        </div>
      </section>
    );
  }
  return <ProductDetail product={state.product} />;
}

function ProductDetail({ product }) {
  const { add, openCheckout, productQty, ordersPlaced } = useCart();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState(null);         // { summary, reviews, myReview } from the API
  const [reviewsError, setReviewsError] = useState('');

  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const [color, setColor] = useState(colors[0]?.name || '');
  const [size, setSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState([]);
  const [pin, setPin] = useState('');
  const [delivery, setDelivery] = useState(null);       // { ok, text }
  const [stock, setStock] = useState(product.stock);    // refreshed below after orders
  const [tab, setTab] = useState(() => (window.location.hash.endsWith('/reviews') ? 'reviews' : 'description'));

  useEffect(() => {
    document.title = `${product.name} · ShopEasy`;
    return () => { document.title = 'ShopEasy'; };
  }, [product.name]);

  // Real customer reviews. Reloaded when the shopper logs in / out so "your review" is right.
  useEffect(() => {
    let cancelled = false;
    api.reviews(product.id)
      .then((data) => { if (!cancelled) { setReviews(data); setReviewsError(''); } })
      .catch((e) => { if (!cancelled) setReviewsError(e.message); });
    return () => { cancelled = true; };
  }, [product.id, user?.id]);

  // Arrived from "My orders" -> "Write a review": jump to the reviews block once it has rendered.
  useEffect(() => {
    if (reviews && window.location.hash.endsWith('/reviews')) {
      setTab('reviews');
      setTimeout(() => document.getElementById('pdp-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [reviews === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stock may change after an order is placed: re-read it.
  useEffect(() => {
    if (!ordersPlaced) return;
    api.product(product.id).then((p) => setStock(p.stock)).catch(() => {});
  }, [ordersPlaced, product.id]);

  const images = useMemo(() => {
    const list = galleryImages(product).filter((u) => !failed.includes(u));
    return list.length ? list : [FALLBACK_IMAGE];
  }, [product, failed]);
  const mainImage = images[Math.min(active, images.length - 1)];
  const markFailed = (url) => { if (url !== FALLBACK_IMAGE) setFailed((f) => [...f, url]); };

  const off = discountPercent(product);
  const inBag = productQty(product.id);
  const available = Math.max(0, stock - inBag);        // what the shopper can still add
  const soldOut = stock < 1;
  const maxQty = Math.min(MAX_QTY, Math.max(available, 1));
  const chosenQty = Math.min(qty, maxQty);
  const needsSize = sizes.length > 0;

  function validate() {
    if (needsSize && !size) {
      setSizeError(true);
      toast('Please select a size');
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  function addToBag() {
    if (!validate()) return;
    add({ ...product, stock }, { size, color, quantity: chosenQty });
  }

  function buyNow() {
    if (!validate()) return;
    if (!add({ ...product, stock }, { size, color, quantity: chosenQty, silent: true })) return;
    if (!user) {
      // Buy Now needs an account: log in first, then land on checkout (address + payment).
      try { sessionStorage.setItem('shopeasyNext', '#/checkout'); } catch { /* ignore */ }
      toast('Please log in to continue with your purchase');
      window.location.hash = '#/login';
      return;
    }
    openCheckout();
  }

  function checkPin(e) {
    e.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setDelivery({ ok: false, text: 'Enter a valid 6-digit PIN code.' });
      return;
    }
    // Demo estimate: PIN codes starting with 6 (Tamil Nadu / Kerala) get the faster slot.
    const fast = pin.startsWith('6');
    setDelivery({ ok: true, text: `Delivery by ${deliveryDate(fast ? 2 : 4)}${fast ? '' : ` – ${deliveryDate(6)}`}` });
  }

  const summary = reviews?.summary;
  const specs = Object.entries(product.specifications || {});
  const highlights = product.highlights || [];
  const reviewCount = summary?.count || 0;

  return (
    <section className="se-page">
      <nav className="se-crumbs" aria-label="Breadcrumb">
        <a href="#/">Home</a><Icon name="chevronRight" size={12} />
        <a href={`#/products?category=${encodeURIComponent(product.category)}`}>{product.category}</a><Icon name="chevronRight" size={12} />
        <b>{product.name}</b>
      </nav>

      <div className="se-pdp">
        {/* ---------- gallery ---------- */}
        <div className="se-gallery">
          {images.length > 1 && (
            <div className="se-thumbs" role="tablist" aria-label="Product images">
              {images.map((url, i) => (
                <button
                  key={url}
                  role="tab"
                  aria-selected={url === mainImage}
                  aria-label={`Image ${i + 1}`}
                  className={url === mainImage ? 'on' : ''}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <img src={url} alt="" onError={() => markFailed(url)} />
                </button>
              ))}
            </div>
          )}
          <div className="se-stage">
            {off > 0 && !soldOut && <span className="se-tag off">-{off}%</span>}
            <img src={mainImage} alt={product.name} onError={() => markFailed(mainImage)} />
          </div>
        </div>

        {/* ---------- buy box ---------- */}
        <div className="se-buybox">
          <h1>{product.name}</h1>
          <p className="se-buy-sub">{[product.brand, product.category].filter(Boolean).join(' · ')}</p>
          <div className="se-buy-rating">
            {reviewCount > 0 ? (
              <>
                <StarRow value={summary.average} size={16} />
                <b>{summary.average.toFixed(1)}</b>
                <a href="#reviews" onClick={(e) => { e.preventDefault(); setTab('reviews'); document.getElementById('pdp-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  ({reviewCount.toLocaleString('en-IN')} review{reviewCount === 1 ? '' : 's'})
                </a>
              </>
            ) : (
              <a href="#reviews" onClick={(e) => { e.preventDefault(); setTab('reviews'); document.getElementById('pdp-tabs')?.scrollIntoView({ behavior: 'smooth' }); }}>
                No reviews yet - write the first
              </a>
            )}
          </div>

          <div className="se-buy-price">
            <b>{money(product.price)}</b>
            {off > 0 && <s>{money(product.mrp)}</s>}
            {off > 0 && <span className="se-off">{off}% off</span>}
          </div>
          <p className="se-tiny">Inclusive of all taxes{off > 0 && ` · You save ${money(product.mrp - product.price)}`}</p>

          <ul className="se-perks">
            <li><Icon name="truck" size={18} /> Free Delivery by <b>{deliveryDate(3)}</b></li>
            <li><Icon name="returnBox" size={18} /> Easy returns</li>
            <li><Icon name="shield" size={18} /> Secure checkout &amp; genuine product</li>
          </ul>

          {colors.length > 0 && (
            <div className="se-option">
              <p className="se-option-label">Select Color <b>{color}</b></p>
              <div className="se-swatches" role="radiogroup" aria-label="Color">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    role="radio"
                    aria-checked={color === c.name}
                    aria-label={c.name}
                    title={c.name}
                    className={color === c.name ? 'on' : ''}
                    onClick={() => setColor(c.name)}
                  >
                    <span style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {needsSize && (
            <div className="se-option" id="size-picker">
              <p className="se-option-label">Select Size <b>{size}</b></p>
              <div className={`se-sizes ${sizeError && !size ? 'shake' : ''}`} role="radiogroup" aria-label="Size">
                {sizes.map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={size === s}
                    className={size === s ? 'on' : ''}
                    onClick={() => { setSize(s); setSizeError(false); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && !size && <p className="se-error" role="alert">Please select a size to continue.</p>}
            </div>
          )}

          <p className={`se-stock ${soldOut ? 'out' : stock <= 5 ? 'low' : 'in'}`}>
            {soldOut ? 'Currently unavailable' : stock <= 5 ? `Hurry! Only ${stock} left in stock` : 'In stock'}
          </p>

          {!soldOut && !isAdmin && (
            <div className="se-qty-row">
              <span className="se-option-label">Quantity</span>
              <div className="se-stepper">
                <button aria-label="Decrease quantity" disabled={chosenQty <= 1} onClick={() => setQty(chosenQty - 1)}><Icon name="minus" size={14} /></button>
                <span aria-live="polite">{chosenQty}</span>
                <button aria-label="Increase quantity" disabled={chosenQty >= maxQty || available < 1} onClick={() => setQty(chosenQty + 1)}><Icon name="plus" size={14} /></button>
              </div>
              {inBag > 0 && <span className="se-tiny">{inBag} already in your cart</span>}
            </div>
          )}

          {!isAdmin && (
            <div className="se-buy-actions">
              <button className="se-btn primary lg" disabled={soldOut || available < 1} onClick={addToBag}>
                <Icon name="cart" size={18} /> {soldOut ? 'Out of stock' : available < 1 ? 'Max quantity in cart' : 'Add to Cart'}
              </button>
              <button className="se-btn outline lg" disabled={soldOut || available < 1} onClick={buyNow}>Buy Now</button>
              <WishlistButton product={product} variant="full" />
            </div>
          )}

          {highlights.length > 0 && (
            <ul className="se-chips">
              {highlights.slice(0, 3).map((h) => <li key={h}><Icon name="check" size={14} /> {h}</li>)}
            </ul>
          )}

          <form className="se-pin" onSubmit={checkPin}>
            <label htmlFor="pin">Check delivery</label>
            <div>
              <input id="pin" inputMode="numeric" maxLength={6} placeholder="Enter PIN code" value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setDelivery(null); }} />
              <button type="submit" className="se-btn ghost">Check</button>
            </div>
            {delivery && <p className={delivery.ok ? 'se-ok' : 'se-error'}>{delivery.text}</p>}
          </form>
        </div>
      </div>

      {/* ---------- tabs ---------- */}
      <div className="se-tabs-card" id="pdp-tabs">
        <div className="se-tabs" role="tablist">
          {[['description', 'Description'], ['specs', 'Specifications'], ['reviews', `Reviews${reviewCount ? ` (${reviewCount})` : ''}`]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="se-tab-panel">
          {tab === 'description' && (
            <>
              <p>{product.description}</p>
              {highlights.length > 0 && <ul className="se-bullets">{highlights.map((h) => <li key={h}>{h}</li>)}</ul>}
            </>
          )}
          {tab === 'specs' && (
            specs.length > 0
              ? <table className="se-spec"><tbody>{specs.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
              : <p className="se-muted">No specifications listed for this product.</p>
          )}
          {tab === 'reviews' && <Reviews productId={product.id} data={reviews} loadError={reviewsError} onData={setReviews} />}
        </div>
      </div>

      <Recommendations product={product} />
    </section>
  );
}
