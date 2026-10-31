// "Recently viewed" products, kept in this browser only (localStorage). Every call is wrapped in try/catch
// because storage can be unavailable (private mode, blocked cookies).
const KEY = 'shopeasyRecentlyViewed';
const MAX = 12;

export function getViewed() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function rememberViewed(productId) {
  if (!Number.isInteger(productId)) return;
  try {
    const next = [productId, ...getViewed().filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore - the feature is optional */
  }
}
