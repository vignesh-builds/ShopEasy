import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

// Wishlist = list of product ids.
//   logged in -> stored in the database through /api/wishlist
//   guest     -> stored in this browser (localStorage); moved into the account after login
const KEY = 'shopeasyWishlist';

function readGuest() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list.filter((n) => Number.isInteger(n)) : [];
  } catch { return []; }
}
function writeGuest(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* private mode: keep in memory only */ }
}

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState(() => (userId ? [] : readGuest()));

  // Load on start and whenever the shopper logs in / out.
  useEffect(() => {
    let cancelled = false;
    if (!userId) { setIds(readGuest()); return undefined; }
    (async () => {
      try {
        const guest = readGuest();
        const saved = guest.length ? await api.mergeWishlist(guest) : await api.wishlist();
        if (guest.length) writeGuest([]);
        if (!cancelled) setIds(saved);
      } catch (e) {
        if (!cancelled) { setIds([]); console.error('Could not load wishlist:', e.message); }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const toggle = useCallback(async (productId) => {
    const had = ids.includes(productId);
    const next = had ? ids.filter((x) => x !== productId) : [productId, ...ids];
    setIds(next);                                   // heart changes instantly
    if (!userId) {
      writeGuest(next);
      toast(had ? 'Removed from wishlist' : 'Saved to wishlist');
      return;
    }
    try {
      const saved = had ? await api.removeWishlist(productId) : await api.addWishlist(productId);
      setIds(saved);
      toast(had ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch (e) {
      setIds(ids);                                  // roll back
      toast(e.message);
    }
  }, [ids, userId, toast]);

  const value = useMemo(() => ({
    ids,
    count: ids.length,
    has: (productId) => ids.includes(productId),
    toggle,
  }), [ids, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
