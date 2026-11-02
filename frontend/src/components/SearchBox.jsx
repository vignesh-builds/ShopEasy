import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { go } from '../hooks/useHashRoute.js';
import { FALLBACK_IMAGE, money } from '../utils/format.js';
import Icon from './Icon.jsx';

const DEBOUNCE_MS = 300;   // wait until the shopper pauses typing before calling the API
const MIN_CHARS = 2;
const MAX_SUGGESTIONS = 6;

/** Returns `value` only after it has stopped changing for `delay` ms. */
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Bold the part of `text` that matches what the shopper typed. */
function Highlight({ text, query }) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
  return parts.map((part, i) => (part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part));
}

/** Header search box with live (debounced) product suggestions. */
export default function SearchBox({ text, setText }) {
  const listId = useId();
  const boxRef = useRef(null);
  const cache = useRef(new Map());          // query -> results, so retyping the same thing is instant
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState({ query: '', items: [], total: 0, loading: false });

  const query = useDebounced(text.trim(), DEBOUNCE_MS);
  const typing = text.trim() !== query;     // the box has changed but the debounce has not fired yet

  useEffect(() => {
    if (query.length < MIN_CHARS) { setState({ query, items: [], total: 0, loading: false }); return undefined; }
    const hit = cache.current.get(query.toLowerCase());
    if (hit) { setState({ query, ...hit, loading: false }); return undefined; }
    let cancelled = false;                  // a slower, older response must never overwrite a newer one
    setState((s) => ({ ...s, query, loading: true }));
    api.products({ q: query })
      .then((list) => {
        const result = { items: list.slice(0, MAX_SUGGESTIONS), total: list.length };
        cache.current.set(query.toLowerCase(), result);
        if (!cancelled) setState({ query, ...result, loading: false });
      })
      .catch(() => { if (!cancelled) setState({ query, items: [], total: 0, loading: false }); });
    return () => { cancelled = true; };
  }, [query]);

  // Close when clicking anywhere outside the search box.
  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const { items, total, loading } = state;
  const showPanel = open && text.trim().length >= MIN_CHARS;
  const rows = items.length + 1;            // product rows + the "see all results" row

  function search(e) {
    e?.preventDefault();
    setOpen(false);
    go('/products', { q: text.trim() });
  }

  function openProduct(p) {
    setOpen(false);
    setText(p.name);
    window.location.hash = `#/product/${p.id}`;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setActive(-1); return; }
    if (!showPanel) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % rows); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? rows - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0 && active < items.length) { e.preventDefault(); openProduct(items[active]); }
  }

  return (
    <form className="se-search" role="search" onSubmit={search} ref={boxRef}>
      <input
        aria-label="Search products"
        placeholder="Search for products, brands and more..."
        value={text}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {text && (
        <button type="button" className="se-search-clear" aria-label="Clear search" onClick={() => { setText(''); setOpen(false); }}>
          <Icon name="close" size={16} />
        </button>
      )}
      <button type="submit" aria-label="Search"><Icon name="search" size={18} /></button>

      {showPanel && (
        <ul className="se-suggest" id={listId} role="listbox">
          {(loading || typing) && items.length === 0 && <li className="se-suggest-note">Searching…</li>}
          {!loading && !typing && items.length === 0 && <li className="se-suggest-note">No products match “{query}”</li>}
          {items.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={active === i}
              className={`se-suggest-row ${active === i ? 'on' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); openProduct(p); }}
            >
              <img src={p.imageUrl || FALLBACK_IMAGE} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} />
              <span className="se-suggest-text">
                <b><Highlight text={p.name} query={state.query} /></b>
                <small>{[p.category, p.brand].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="se-suggest-price">{money(p.price)}</span>
            </li>
          ))}
          {items.length > 0 && (
            <li
              role="option"
              aria-selected={active === items.length}
              className={`se-suggest-row all ${active === items.length ? 'on' : ''}`}
              onMouseEnter={() => setActive(items.length)}
              onMouseDown={(e) => { e.preventDefault(); search(); }}
            >
              <Icon name="search" size={16} />
              <span className="se-suggest-text"><b>See all {total} result{total === 1 ? '' : 's'} for “{state.query}”</b></span>
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
