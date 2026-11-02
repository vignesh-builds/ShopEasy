import { useAuth } from '../context/AuthContext.jsx';
import { FALLBACK_IMAGE, discountPercent, money } from '../utils/format.js';
import { MiniStars } from './Stars.jsx';
import WishlistButton from './WishlistButton.jsx';

/** Product tile used on the home page, listing, recommendations. `compact` = smaller tile without the button. */
export default function ProductCard({ product, onAdd, compact = false }) {
  const { isAdmin } = useAuth();
  const soldOut = product.stock < 1;
  const off = discountPercent(product);
  const href = `#/product/${product.id}`;

  function quickAdd() {
    // Straight into the bag with the default colour / size (can be changed on the product page).
    onAdd(product, { color: product.colors?.[0]?.name || '', size: product.sizes?.[0] || '' });
  }

  return (
    <article className={`se-card ${compact ? 'compact' : ''}`}>
      <div className="se-card-media">
        <a href={href} aria-label={`View ${product.name}`}>
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
          />
        </a>
        <WishlistButton product={product} />
        {soldOut && <span className="se-tag sold">Sold out</span>}
      </div>
      <div className="se-card-body">
        <h3><a href={href}>{product.name}</a></h3>
        <p className="se-card-sub">{[product.brand, product.category].filter(Boolean).join(' · ')}</p>
        <MiniStars rating={product.rating} count={product.ratingCount} />
        <p className="se-price-row">
          <b>{money(product.price)}</b>
          {off > 0 && <s>{money(product.mrp)}</s>}
          {off > 0 && <span className="se-off">{off}% off</span>}
        </p>
        {!compact && !isAdmin && (
          <button className="se-btn primary block" disabled={soldOut} onClick={quickAdd}>
            {soldOut ? 'Out of stock' : 'Add to Cart'}
          </button>
        )}
      </div>
    </article>
  );
}
