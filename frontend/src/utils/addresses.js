// Saved delivery addresses. The backend has no address book, so they are kept in this browser (per account e-mail).
const key = (email) => `shopeaseAddresses:${(email || 'guest').toLowerCase()}`;

export function loadAddresses(email) {
  try {
    const list = JSON.parse(localStorage.getItem(key(email)));
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function write(email, list) {
  try { localStorage.setItem(key(email), JSON.stringify(list)); } catch { /* storage blocked */ }
  return list;
}

export function saveAddress(email, address) {
  const list = loadAddresses(email);
  const id = address.id || `a${Date.now()}`;
  const entry = { ...address, id };
  const others = list.filter((a) => a.id !== id);
  const next = [entry, ...others];
  if (entry.isDefault || next.length === 1) next.forEach((a) => { a.isDefault = a.id === id; });
  return write(email, next);
}

export function deleteAddress(email, id) {
  const next = loadAddresses(email).filter((a) => a.id !== id);
  if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
  return write(email, next);
}

export function makeDefault(email, id) {
  return write(email, loadAddresses(email).map((a) => ({ ...a, isDefault: a.id === id })));
}

/** One-line text sent to the backend as the order's delivery address. */
export const addressText = (a) =>
  [a.line1, a.city, a.state && `${a.state} - ${a.pin}`, a.phone && `Phone: ${a.phone}`].filter(Boolean).join(', ');
