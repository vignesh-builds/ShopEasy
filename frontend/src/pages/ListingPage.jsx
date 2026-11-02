import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { go, hashParam } from '../hooks/useHashRoute.js';
import { discountPercent, money } from '../utils/format.js';

const PRICE_RANGES = [
  { id: 'p1', label: `Below ${money(1000)}`, test: (p) => p < 1000 },
  { id: 'p2', label: `${money(1000)} - ${money(2500)}`, test: (p) => p >= 1000 && p < 2500 },
  { id: 'p3', label: `${money(2500)} - ${money(5000)}`, test: (p) => p >= 2500 && p < 5000 },
  { id: 'p4', label: `${money(5000)} - ${money(10000)}`, test: (p) => p >= 5000 && p < 10000 },
  { id: 'p5', label: `Above ${money(10000)}`, test: (p) => p >= 10000 },
];
const RATINGS = [4, 3, 2];
const SORTS = {
  popularity: ['Popularity', (a, b) => (b.ratingCount || 0) - (a.ratingCount || 0) || b.id - a.id],
  'price-asc': ['Price: Low to High', (a, b) => a.price - b.price],
  'price-desc': ['Price: High to Low', (a, b) => b.price - a.price],
  rating: ['Customer Rating', (a, b) => (b.rating || 0) - (a.rating || 0)],
  discount: ['Discount', (a, b) => discountPercent(b) - discountPercent(a)],
  newest: ['Newest First', (a, b) => b.id - a.id],
};

export default function ListingPage() {
  const { add, ordersPlaced } = useCart();
  const q = hashParam('q');
  const category = hashParam('category');
  const sort = SORTS[hashParam('sort')] ? hashParam('sort') : 'popularity';

  const [all, setAll] = useState([]);           // everything that matches the search text (category filtered here for counts)
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [brands, setBrands] = useState([]);
  const [priceId, setPriceId] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [q, category]);
  useEffect(() => { api.categories().then(setCategories).catch(() => {}); }, [ordersPlaced]);

  useEffect(() => {
    let cancelled = false;
    setStatus({ loading: true, error: '' });
    api.products({ q })
      .then((data) => { if (!cancelled) { setAll(data); setStatus({ loading: false, error: '' }); } })
      .catch((e) => { if (!cancelled) setStatus({ loading: false, error: e.message }); });
    return () => { cancelled = true; };
  }, [q, ordersPlaced]);

  const inCategory = useMemo(() => (category ? all.filter((p) => p.category === category) : all), [all, category]);
  const brandList = useMemo(() => [...new Set(inCategory.map((p) => p.brand).filter(Boolean))].sort(), [inCategory]);
  const countByCategory = useMemo(() => {
    const m = {};
    all.forEach((p) => { m[p.category] = (m[p.category] || 0) + 1; });
    return m;
  }, [all]);

  const shown = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.id === priceId);
    return inCategory
      .filter((p) => !brands.length || brands.includes(p.brand))
      .filter((p) => !range || range.test(p.price))
      .filter((p) => !minRating || (p.rating || 0) >= minRating)
      .sort(SORTS[sort][1]);
  }, [inCategory, brands, priceId, minRating, sort]);

  const activeFilters = brands.length + (priceId ? 1 : 0) + (minRating ? 1 : 0);
  const clear = () => { setBrands([]); setPriceId(''); setMinRating(0); };
  const toggleBrand = (b) => setBrands((list) => (list.includes(b) ? list.filter((x) => x !== b) : [...list, b]));
  const setParam = (changes) => go('/products', { q, category, sort: sort === 'popularity' ? '' : sort, ...changes });

  const title = q ? `Results for "${q}"` : category || 'All Products';

  return (
    <section className="se-page">
      <nav className="se-crumbs" aria-label="Breadcrumb">
        <a href="#/">Home</a><Icon name="chevronRight" size={12} />
        {category ? <><a href="#/products">Products</a><Icon name="chevronRight" size={12} /><b>{category}</b></> : <b>Products</b>}
      </nav>

      <div className="se-listing">
        <aside className={`se-filters ${filtersOpen ? 'open' : ''}`} aria-label="Filters">
          <div className="se-filters-head">
            <h2>Filters</h2>
            {activeFilters > 0 && <button className="se-link" onClick={clear}>Clear All</button>}
            <button className="se-filters-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}><Icon name="close" /></button>
          </div>

          <fieldset>
            <legend>Category</legend>
            <label className="se-check">
              <input type="checkbox" checked={!category} onChange={() => setParam({ category: '' })} />
              <span>All</span><em>({all.length})</em>
            </label>
            {categories.map((c) => (
              <label className="se-check" key={c}>
                <input type="checkbox" checked={category === c} onChange={() => setParam({ category: category === c ? '' : c })} />
                <span>{c}</span><em>({countByCategory[c] || 0})</em>
              </label>
            ))}
          </fieldset>

          {brandList.length > 0 && (
            <fieldset>
              <legend>Brand</legend>
              {brandList.map((b) => (
                <label className="se-check" key={b}>
                  <input type="checkbox" checked={brands.includes(b)} onChange={() => toggleBrand(b)} />
                  <span>{b}</span><em>({inCategory.filter((p) => p.brand === b).length})</em>
                </label>
              ))}
            </fieldset>
          )}

          <fieldset>
            <legend>Price Range</legend>
            {PRICE_RANGES.map((r) => (
              <label className="se-check radio" key={r.id}>
                <input type="radio" name="price" checked={priceId === r.id} onChange={() => setPriceId(r.id)} />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Customer Rating</legend>
            {RATINGS.map((r) => (
              <label className="se-check radio" key={r}>
                <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                <span className="se-stars-inline">{'★'.repeat(r)}<i>{'★'.repeat(5 - r)}</i></span>
                <span>{r}★ & above</span>
              </label>
            ))}
          </fieldset>

          <button className="se-btn primary block se-apply" onClick={() => setFiltersOpen(false)}>Show {shown.length} results</button>
        </aside>
        {filtersOpen && <div className="se-scrim" onClick={() => setFiltersOpen(false)} />}

        <div className="se-results">
          <div className="se-results-head">
            <div>
              <h1>{title} <small>({shown.length} product{shown.length === 1 ? '' : 's'})</small></h1>
            </div>
            <div className="se-sortbar">
              <button className="se-btn ghost se-filter-btn" onClick={() => setFiltersOpen(true)}>
                <Icon name="filter" size={16} /> Filters{activeFilters > 0 && <b className="se-badge inline">{activeFilters}</b>}
              </button>
              <label className="se-sort">
                <span>Sort by:</span>
                <select value={sort} onChange={(e) => setParam({ sort: e.target.value === 'popularity' ? '' : e.target.value })}>
                  {Object.entries(SORTS).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {status.loading && <div className="se-grid three">{[0, 1, 2].map((i) => <div key={i} className="se-skeleton" />)}</div>}
          {status.error && (
            <div className="se-empty"><Icon name="box" size={40} /><h2>Could not load products</h2><p>Is the Spring Boot server running?</p><small>{status.error}</small></div>
          )}
          {!status.loading && !status.error && shown.length === 0 && (
            <div className="se-empty">
              <Icon name="search" size={40} />
              <h2>No products found</h2>
              <p>Try a different search or remove some filters.</p>
              <button className="se-btn primary" onClick={() => { clear(); go('/products'); }}>Reset everything</button>
            </div>
          )}
          {!status.loading && !status.error && shown.length > 0 && (
            <div className="se-grid three">
              {shown.map((p) => <ProductCard key={p.id} product={p} onAdd={add} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
