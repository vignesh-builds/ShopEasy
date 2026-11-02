import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { hashParam } from '../hooks/useHashRoute.js';
import Icon from './Icon.jsx';
import SearchBox from './SearchBox.jsx';

export default function Navbar({ route }) {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const [categories, setCategories] = useState([]);
  const [text, setText] = useState(() => hashParam('q'));

  useEffect(() => { api.categories().then(setCategories).catch(() => {}); }, []);
  // Keep the box in sync when the listing page changes the search (or it is cleared).
  useEffect(() => { if (route === '/products') setText(hashParam('q')); else if (route === '/') setText(''); }, [route]);

  const onAdmin = route.startsWith('/admin');
  const activeCategory = route === '/products' ? hashParam('category') : '';

  const account = user ? '#/account' : '#/login';
  const firstName = user?.fullName?.split(' ')[0];

  return (
    <header className="se-header">
      <div className="se-header-main">
        <a className="se-brand" href="#/" aria-label="ShopEasy home">
          <span className="se-brand-mark"><Icon name="bag" size={18} stroke={2.2} /></span>
          <span>ShopEasy</span>
        </a>

        {!onAdmin && (
          <SearchBox text={text} setText={setText} />
        )}
        {onAdmin && <div className="se-spacer" />}

        <nav className="se-actions" aria-label="Account and cart">
          {isAdmin && (
            <>
              <a className={`se-text-link ${route === '/admin' ? 'on' : ''}`} href="#/admin">Dashboard</a>
              <a className={`se-text-link ${route === '/admin/orders' ? 'on' : ''}`} href="#/admin/orders">Orders</a>
              <button className="se-text-link" onClick={() => logout('You have logged out.')}>Logout</button>
            </>
          )}
          {!isAdmin && (
            <>
              <a className="se-icon-btn" href={account} aria-label={user ? 'My account' : 'Login'} title={user ? `Hi, ${firstName}` : 'Login / Sign up'}>
                <Icon name="user" />
                {user && <span className="se-hello">Hi, {firstName}</span>}
              </a>
              <a className="se-icon-btn" href="#/wishlist" aria-label={`Wishlist, ${wishCount} saved`} title="Wishlist">
                <Icon name="heart" />
                {wishCount > 0 && <b className="se-badge">{wishCount}</b>}
              </a>
              <a className="se-icon-btn" href="#/cart" aria-label={`Cart, ${count} items`} title="Cart">
                <Icon name="cart" />
                {count > 0 && <b className="se-badge">{count}</b>}
              </a>
            </>
          )}
        </nav>
      </div>

      {!onAdmin && (
        <nav className="se-catbar" aria-label="Categories">
          <a className={`se-catlink all ${route === '/products' && !activeCategory ? 'on' : ''}`} href="#/products">
            <Icon name="menu" size={16} /> All Categories <Icon name="chevronDown" size={14} />
          </a>
          <a className="se-catlink" href="#/products?sort=discount">Deals</a>
          {categories.slice(0, 6).map((c) => (
            <a key={c} className={`se-catlink ${activeCategory === c ? 'on' : ''}`} href={`#/products?category=${encodeURIComponent(c)}`}>{c}</a>
          ))}
          {user && !isAdmin && <a className={`se-catlink push ${route === '/orders' ? 'on' : ''}`} href="#/orders">My Orders</a>}
        </nav>
      )}
    </header>
  );
}

/** Fixed tab bar at the bottom of phone screens (matches the mobile design). */
export function BottomNav({ route }) {
  const { user, isAdmin } = useAuth();
  const { count: wishCount } = useWishlist();
  const { count } = useCart();
  if (isAdmin || route.startsWith('/admin')) return null;
  const tabs = [
    { href: '#/', label: 'Home', icon: 'home', on: route === '/' },
    { href: '#/products', label: 'Categories', icon: 'grid', on: route === '/products' },
    { href: '#/wishlist', label: 'Wishlist', icon: 'heart', on: route === '/wishlist', badge: wishCount },
    { href: '#/cart', label: 'Cart', icon: 'cart', on: route === '/cart', badge: count },
    { href: user ? '#/account' : '#/login', label: 'Account', icon: 'user', on: route === '/account' || route === '/login' },
  ];
  return (
    <nav className="se-bottomnav" aria-label="Main">
      {tabs.map((t) => (
        <a key={t.label} href={t.href} className={t.on ? 'on' : ''}>
          <span className="se-bn-icon">
            <Icon name={t.icon} size={22} fill={t.on && t.icon === 'heart' ? 'currentColor' : 'none'} />
            {t.badge > 0 && <b className="se-badge">{t.badge}</b>}
          </span>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
