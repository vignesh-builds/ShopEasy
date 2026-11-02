import { useAuth } from '../context/AuthContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import Icon from './Icon.jsx';

/** Heart toggle. variant "card" = round icon on a product photo, "full" = labelled button on the detail page. */
export default function WishlistButton({ product, variant = 'card' }) {
  const { isAdmin } = useAuth();
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  if (isAdmin) return null;                       // wishlist is for customers only
  const label = saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`;

  return (
    <button
      type="button"
      className={`se-wish ${variant} ${saved ? 'saved' : ''}`}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
    >
      <Icon name="heart" size={variant === 'full' ? 18 : 17} fill={saved ? 'currentColor' : 'none'} />
      {variant === 'full' && <span>{saved ? 'Saved to wishlist' : 'Save to wishlist'}</span>}
    </button>
  );
}
