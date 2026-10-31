import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import PriceDetails from '../components/PriceDetails.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { addressText, loadAddresses, saveAddress } from '../utils/addresses.js';
import { FALLBACK_IMAGE, money } from '../utils/format.js';

const STEPS = ['Address', 'Payment', 'Review'];
const PAYMENT = [
  { id: 'UPI', label: 'UPI (Google Pay, PhonePe, Paytm)', icon: 'phone' },
  { id: 'Card', label: 'Credit / Debit Card', icon: 'card' },
  { id: 'Net Banking', label: 'Net Banking', icon: 'bank' },
  { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: 'cash' },
];
const EMPTY = { fullName: '', phone: '', line1: '', city: '', state: '', pin: '' };

export default function CheckoutPage() {
  const { user, openAuth } = useAuth();
  const { entries, completeOrder, refreshStock } = useCart();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(() => loadAddresses(user?.email));
  const [addressId, setAddressId] = useState(() => (loadAddresses(user?.email).find((a) => a.isDefault) || loadAddresses(user?.email)[0])?.id || 'new');
  const [form, setForm] = useState({ ...EMPTY, fullName: user?.fullName || '' });
  const [email, setEmail] = useState(user?.email || '');
  const [remember, setRemember] = useState(true);
  const [payment, setPayment] = useState('UPI');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [step, placed]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const chosen = useMemo(() => (addressId === 'new' ? { ...form } : saved.find((a) => a.id === addressId)), [addressId, form, saved]);

  /* ---------- order placed ---------- */
  if (placed) {
    return (
      <section className="se-page narrow">
        <div className="se-success">
          <span className="se-success-mark"><Icon name="check" size={34} stroke={2.6} /></span>
          <h1>Order placed, {placed.customerName.split(' ')[0]}!</h1>
          <p>Order <b>#{placed.id}</b> · Total <b>{money(placed.total)}</b></p>
          <p className="se-muted">We sent a confirmation to {placed.email}. This is a demo checkout, so no payment was taken.</p>
          <div className="se-success-actions">
            {user && <a className="se-btn primary" href={`#/track/${placed.id}`}>Track Order</a>}
            <a className={`se-btn ${user ? 'outline' : 'primary'}`} href="#/">Continue Shopping</a>
          </div>
        </div>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="se-page narrow">
        <div className="se-empty">
          <Icon name="cart" size={44} />
          <h2>Nothing to check out</h2>
          <p>Your cart is empty.</p>
          <a className="se-btn primary" href="#/products">Browse products</a>
        </div>
      </section>
    );
  }

  /* ---------- validation / navigation ---------- */
  function validateDelivery() {
    if (!email.trim()) return 'Please enter your email address.';
    if (!chosen?.fullName?.trim() || chosen.fullName.trim().length < 2) return 'Please enter the recipient name.';
    if (!/^[6-9]\d{9}$/.test((chosen.phone || '').replace(/\s/g, ''))) return 'Enter a valid 10-digit mobile number.';
    if (!chosen.line1?.trim() || chosen.line1.trim().length < 5) return 'Please enter the full street address.';
    if (!chosen.city?.trim() || !chosen.state?.trim()) return 'Please enter city and state.';
    if (!/^[1-9]\d{5}$/.test(chosen.pin || '')) return 'Enter a valid 6-digit PIN code.';
    return '';
  }

  function next() {
    setError('');
    if (step === 0) {
      const problem = validateDelivery();
      if (problem) { setError(problem); return; }
      if (addressId === 'new' && remember && user) {
        const list = saveAddress(user.email, { ...form, phone: form.phone.replace(/\s/g, '') });
        setSaved(list);
        setAddressId(list[0].id);
      }
    }
    setStep((s) => s + 1);
  }

  async function placeOrder() {
    setBusy(true);
    setError('');
    try {
      const order = await api.placeOrder({
        customerName: chosen.fullName.trim(),
        email: email.trim(),
        // The API stores one address text, so the payment choice is appended to it for the admin / packing slip.
        address: `${addressText(chosen)} | Payment: ${payment}${payment === 'Cash on Delivery' ? '' : ' (demo - no money taken)'}`,
        items: entries.map((x) => ({ productId: x.product.id, quantity: x.quantity, size: x.size || null, color: x.color || null })),
      });
      completeOrder();
      setPlaced(order);
      toast(`Order #${order.id} placed successfully!`);
    } catch (err) {
      setError(err.message || 'Could not place the order');
      refreshStock();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="se-page">
      <h1 className="se-title">Checkout</h1>

      <ol className="se-steps" aria-label="Checkout progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i < step ? 'done' : i === step ? 'now' : ''}>
            <span>{i < step ? <Icon name="check" size={14} stroke={3} /> : i + 1}</span>{label}
          </li>
        ))}
      </ol>

      <div className="se-two">
        <div className="se-panel">
          {/* ---------- 1. delivery ---------- */}
          {step === 0 && (
            <>
              {!user && (
                <p className="se-note">Checking out as a guest. <button className="se-link" onClick={() => openAuth('login')}>Log in</button> to save addresses and track orders.</p>
              )}
              <h2 className="se-h2"><b>1.</b> Delivery Address
                {saved.length > 0 && addressId !== 'new' && <button className="se-link right" onClick={() => setAddressId('new')}>+ Add New Address</button>}
              </h2>

              {saved.length > 0 && (
                <div className="se-choices">
                  {saved.map((a) => (
                    <label key={a.id} className={`se-choice address ${addressId === a.id ? 'on' : ''}`}>
                      <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                      <Icon name="pin" size={20} />
                      <span><b>{a.fullName}</b>{a.isDefault && <i className="se-pill">Default</i>}<br /><small>{addressText(a)}</small></span>
                    </label>
                  ))}
                  <label className={`se-choice address ${addressId === 'new' ? 'on' : ''}`}>
                    <input type="radio" name="addr" checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                    <Icon name="plus" size={20} /><span><b>Use a new address</b></span>
                  </label>
                </div>
              )}

              {addressId === 'new' && (
                <div className="se-form grid">
                  <label>Full Name<input value={form.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Recipient name" /></label>
                  <label>Mobile Number<input value={form.phone} onChange={set('phone')} inputMode="numeric" maxLength={10} autoComplete="tel" placeholder="10-digit mobile number" /></label>
                  <label className="wide">Street Address<input value={form.line1} onChange={set('line1')} autoComplete="street-address" placeholder="House no., street, area" /></label>
                  <label>City<input value={form.city} onChange={set('city')} autoComplete="address-level2" placeholder="City" /></label>
                  <label>State<input value={form.state} onChange={set('state')} autoComplete="address-level1" placeholder="State" /></label>
                  <label>PIN Code<input value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="6-digit PIN" /></label>
                  {user && <label className="se-check wide"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Save this address for next time</span></label>}
                </div>
              )}

              <label className="se-form single">Email for order updates
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
              </label>

            </>
          )}

          {/* ---------- 2. payment ---------- */}
          {step === 1 && (
            <>
              <h2 className="se-h2"><b>2.</b> Payment Method</h2>
              <div className="se-choices">
                {PAYMENT.map((m) => (
                  <label key={m.id} className={`se-choice ${payment === m.id ? 'on' : ''}`}>
                    <input type="radio" name="pay" checked={payment === m.id} onChange={() => setPayment(m.id)} />
                    <span>{m.label}</span>
                    <Icon name={m.icon} size={22} className="se-choice-icon" />
                  </label>
                ))}
              </div>
              <p className="se-note"><Icon name="lock" size={14} /> This is a demo store: no real payment is collected whichever method you pick.</p>
            </>
          )}

          {/* ---------- 3. review ---------- */}
          {step === 2 && (
            <>
              <h2 className="se-h2">Review your order</h2>
              <div className="se-review-box">
                <div><h4>Deliver to <button className="se-link right" onClick={() => setStep(0)}>Change</button></h4>
                  <p><b>{chosen.fullName}</b><br />{addressText(chosen)}<br />{email}</p></div>
                <div><h4>Payment <button className="se-link right" onClick={() => setStep(1)}>Change</button></h4>
                  <p>{payment}</p></div>
              </div>
              <div className="se-review-items">
                {entries.map((l) => (
                  <div key={l.key} className="se-review-line">
                    <img src={l.product.imageUrl} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} />
                    <div>
                      <b>{l.product.name}</b>
                      <small>{[l.color && `Color: ${l.color}`, l.size && `Size: ${l.size}`, `Qty: ${l.quantity}`].filter(Boolean).join(' · ')}</small>
                    </div>
                    <b>{money(l.product.price * l.quantity)}</b>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="se-error" role="alert">{error}</p>}

          <div className="se-panel-actions">
            {step > 0
              ? <button className="se-btn ghost" onClick={() => { setError(''); setStep(step - 1); }}><Icon name="arrowLeft" size={16} /> Back</button>
              : <a className="se-btn ghost" href="#/cart"><Icon name="arrowLeft" size={16} /> Back</a>}
            {step < 2
              ? <button className="se-btn primary lg" onClick={next}>{step === 0 ? 'Continue to Payment' : 'Review Order'} <Icon name="arrowRight" size={16} /></button>
              : <button className="se-btn primary lg" disabled={busy} onClick={placeOrder}>{busy ? 'Placing order…' : 'Place Order'}</button>}
          </div>
        </div>

        <PriceDetails entries={entries} />
      </div>
    </section>
  );
}
