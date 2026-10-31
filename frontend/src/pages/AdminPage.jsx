import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY_FORM = {
  name: '', description: '', category: '', price: '', imageUrl: '', stock: '',
  brand: '', mrp: '', images: '', colors: '', sizes: '', highlights: '', specifications: '',
};

// Lists are stored in the database separated by "|"; the admin types them one per line.
const toLines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean).join('|');

export default function AdminPage() {
  const { isAdmin, openAuth } = useAuth();
  const toast = useToast();
  const [data, setData] = useState({ summary: null, products: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [summary, products] = await Promise.all([api.admin.summary(), api.products()]);
      setData({ summary, products });
    } catch (err) {
      toast(err.message);
    }
  }, [toast]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <section className="admin-page">
        <p className="eyebrow">STORE MANAGEMENT</p>
        <h2>Admin dashboard</h2>
        <p>This page is for administrators. Please log in with an admin account.</p>
        <button className="checkout-btn" style={{ maxWidth: 220 }} onClick={() => openAuth('login')}>Login →</button>
      </section>
    );
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name, description: p.description, category: p.category, price: String(p.price),
      imageUrl: p.imageUrl, stock: String(p.stock),
      brand: p.brand || '', mrp: p.mrp ? String(p.mrp) : '',
      images: (p.images || []).join('\n'),
      colors: (p.colors || []).map((c) => `${c.name}:${c.hex}`).join('\n'),
      sizes: (p.sizes || []).join(', '),
      highlights: (p.highlights || []).join('\n'),
      specifications: Object.entries(p.specifications || {}).map(([k, v]) => `${k}:${v}`).join('\n'),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function save(e) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      brand: form.brand.trim(),
      mrp: form.mrp ? Number(form.mrp) : null,
      images: toLines(form.images),
      colors: toLines(form.colors),
      sizes: form.sizes.split(',').map((x) => x.trim()).filter(Boolean).join('|'),
      highlights: toLines(form.highlights),
      specifications: toLines(form.specifications),
    };
    try {
      if (editingId) await api.admin.updateProduct(editingId, payload);
      else await api.admin.createProduct(payload);
      toast(editingId ? 'Product updated' : 'Product added');
      resetForm();
      await load();
    } catch (err) {
      toast(err.message);            // the real reason, e.g. "price: must be greater than or equal to 0"
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try {
      await api.admin.deleteProduct(p.id);
      toast('Product deleted');
      await load();
    } catch (err) {
      toast(err.message);
    }
  }

  const { summary, products } = data;

  return (
    <section className="admin-page">
      <p className="eyebrow">STORE MANAGEMENT</p>
      <h2>Admin dashboard</h2>

      <div id="adminStats" className="admin-stats">
        <div><span>Products</span><strong>{summary ? summary.products : '–'}</strong></div>
        <div><span>Orders</span><strong>{summary ? summary.orders : '–'}</strong></div>
        <div><span>Users</span><strong>{summary ? summary.users : '–'}</strong></div>
        <a href="#/admin/orders?filter=returns" className={summary?.pendingReturns > 0 ? 'attention' : ''} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span>Return requests</span><strong>{summary ? summary.pendingReturns : '–'}</strong>
        </a>
        <div><span>Order value</span><strong>{summary ? `₹${Number(summary.revenue).toLocaleString('en-IN')}` : '–'}</strong></div>
      </div>

      <div className="admin-columns">
        <form id="productForm" className="admin-form" onSubmit={save}>
          <h3>{editingId ? `Edit product #${editingId}` : 'Add product'}</h3>
          <label>Product name<input name="name" required value={form.name} onChange={set('name')} /></label>
          <label>Description<textarea name="description" required value={form.description} onChange={set('description')} /></label>
          <label>Category<input name="category" required value={form.category} onChange={set('category')} /></label>
          <label>Price (₹)<input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={set('price')} /></label>
          <label>Image URL<input name="imageUrl" required value={form.imageUrl} onChange={set('imageUrl')} /></label>
          <label>Stock<input name="stock" type="number" min="0" required value={form.stock} onChange={set('stock')} /></label>

          <h4 className="form-section">Product page details (optional)</h4>
          <label>Brand<input name="brand" value={form.brand} onChange={set('brand')} /></label>
          <label>MRP (₹) – original price, shows the % off<input name="mrp" type="number" min="0" step="0.01" value={form.mrp} onChange={set('mrp')} /></label>
          <label>Extra image URLs (one per line)<textarea name="images" value={form.images} onChange={set('images')} placeholder="https://…" /></label>
          <label>Colors (one per line, Name:#hex)<textarea name="colors" value={form.colors} onChange={set('colors')} placeholder={'Black:#111111\nNavy:#1f2a44'} /></label>
          <label>Sizes (comma separated)<input name="sizes" value={form.sizes} onChange={set('sizes')} placeholder="S, M, L, XL  or  6, 7, 8, 9" /></label>
          <label>Highlights (one per line)<textarea name="highlights" value={form.highlights} onChange={set('highlights')} /></label>
          <label>Specifications (one per line, Key:Value)<textarea name="specifications" value={form.specifications} onChange={set('specifications')} placeholder={'Material:Cotton\nFit:Regular'} /></label>
          <button className="checkout-btn" type="submit">Save product</button>
          {editingId && <button type="button" className="auth-button" onClick={resetForm}>Cancel edit</button>}
        </form>

        <div>
          <h3>Products</h3>
          <div id="adminProducts" className="admin-products">
            {products.length === 0 && <p>No products yet.</p>}
            {products.map((p) => (
              <div className="admin-row" key={p.id}>
                <div><strong>{p.name}</strong><small>₹{p.price} · stock {p.stock}</small></div>
                <div>
                  <button className="mini-btn" onClick={() => startEdit(p)}>Edit</button>
                  <button className="mini-btn danger" onClick={() => remove(p)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
