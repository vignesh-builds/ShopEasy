import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { go, hashParam } from '../hooks/useHashRoute.js';
import { addressText, deleteAddress, loadAddresses, makeDefault, saveAddress } from '../utils/addresses.js';
import { LoginNeeded } from './OrdersPage.jsx';

const EMPTY = { fullName: '', phone: '', line1: '', city: '', state: '', pin: '' };

export default function AccountPage() {
  const { user, logout, isAdmin } = useAuth();
  const { count } = useWishlist();
  const tab = hashParam('tab') === 'addresses' ? 'addresses' : 'profile';
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  if (!user) return <LoginNeeded title="My Account" />;

  const initials = user.fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <section className="se-page">
      <div className="se-account">
        <aside className="se-account-side">
          <div className="se-me">
            <span className="se-avatar">{initials}</span>
            <div><b>{user.fullName}</b><small>{user.email}</small></div>
          </div>
          <nav aria-label="Account">
            <a className={tab === 'profile' ? 'on' : ''} href="#/account"><Icon name="user" size={18} /> Profile</a>
            {!isAdmin && <a href="#/orders"><Icon name="box" size={18} /> My Orders</a>}
            {!isAdmin && <a href="#/wishlist"><Icon name="heart" size={18} /> Wishlist{count > 0 && <em>{count}</em>}</a>}
            {!isAdmin && <a className={tab === 'addresses' ? 'on' : ''} href="#/account?tab=addresses"><Icon name="pin" size={18} /> Addresses</a>}
            {isAdmin && <a href="#/admin"><Icon name="grid" size={18} /> Admin dashboard</a>}
            <button onClick={() => logout('You have logged out.')}><Icon name="logout" size={18} /> Logout</button>
          </nav>
        </aside>

        <div className="se-account-main">
          {tab === 'profile' ? <Profile user={user} /> : <Addresses email={user.email} fullName={user.fullName} />}
        </div>
      </div>
    </section>
  );
}

function Profile({ user }) {
  return (
    <div className="se-card-box">
      <h2>Personal Information</h2>
      <dl className="se-info">
        <div><dt>Name</dt><dd>{user.fullName}</dd></div>
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Account type</dt><dd>{user.role === 'ADMIN' ? 'Administrator' : 'Customer'}</dd></div>
      </dl>
    </div>
  );
}

function Addresses({ email, fullName }) {
  const toast = useToast();
  const [list, setList] = useState(() => loadAddresses(email));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, fullName });
  const [error, setError] = useState('');
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  function save(e) {
    e.preventDefault();
    if (form.fullName.trim().length < 2) return setError('Please enter the recipient name.');
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setError('Enter a valid 10-digit mobile number.');
    if (form.line1.trim().length < 5) return setError('Please enter the full street address.');
    if (!form.city.trim() || !form.state.trim()) return setError('Please enter city and state.');
    if (!/^[1-9]\d{5}$/.test(form.pin)) return setError('Enter a valid 6-digit PIN code.');
    setList(saveAddress(email, form));
    setAdding(false);
    setForm({ ...EMPTY, fullName });
    setError('');
    toast('Address saved');
  }

  return (
    <div className="se-card-box">
      <h2>Saved Addresses {!adding && <button className="se-link right" onClick={() => setAdding(true)}>+ Add New Address</button>}</h2>
      <p className="se-tiny">Addresses are saved in this browser and can be picked at checkout.</p>

      {adding && (
        <form className="se-form grid" onSubmit={save}>
          <label>Full Name<input value={form.fullName} onChange={set('fullName')} /></label>
          <label>Mobile Number<input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" maxLength={10} /></label>
          <label className="wide">Street Address<input value={form.line1} onChange={set('line1')} placeholder="House no., street, area" /></label>
          <label>City<input value={form.city} onChange={set('city')} /></label>
          <label>State<input value={form.state} onChange={set('state')} /></label>
          <label>PIN Code<input value={form.pin} onChange={(e) => setForm((s) => ({ ...s, pin: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" maxLength={6} /></label>
          {error && <p className="se-error wide" role="alert">{error}</p>}
          <div className="wide se-row-actions">
            <button className="se-btn primary" type="submit">Save address</button>
            <button className="se-btn ghost" type="button" onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}

      {!adding && list.length === 0 && <div className="se-empty small"><Icon name="pin" size={34} /><p>No saved addresses yet.</p></div>}
      <div className="se-addr-list">
        {list.map((a) => (
          <article className="se-addr" key={a.id}>
            <Icon name="pin" size={20} />
            <div>
              <b>{a.fullName}</b>{a.isDefault && <i className="se-pill ok">Default</i>}
              <p>{addressText(a)}</p>
              <div className="se-row-actions">
                {!a.isDefault && <button className="se-link" onClick={() => setList(makeDefault(email, a.id))}>Make default</button>}
                <button className="se-link danger" onClick={() => setList(deleteAddress(email, a.id))}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <button className="se-link" onClick={() => go('/orders')}>View my orders →</button>
    </div>
  );
}
