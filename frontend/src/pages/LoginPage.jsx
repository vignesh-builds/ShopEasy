import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { hashParam } from '../hooks/useHashRoute.js';

function nextHash(user) {
  let next = '#/';
  try { next = sessionStorage.getItem('shopeasyNext') || '#/'; sessionStorage.removeItem('shopeasyNext'); } catch { /* ignore */ }
  if (user?.role === 'ADMIN' && (next === '#/' || next.startsWith('#/login'))) return '#/admin';
  return next.startsWith('#/login') ? '#/' : next;
}

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const toast = useToast();
  const initial = ['register', 'forgot'].includes(hashParam('mode')) ? hashParam('mode') : 'login';
  const [mode, setMode] = useState(initial);          // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Fields stay read-only until clicked so the browser cannot auto-fill a saved email / password into them.
  const [unlocked, setUnlocked] = useState(false);
  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setMode(['register', 'forgot'].includes(hashParam('mode')) ? hashParam('mode') : 'login'); }, [window.location.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const switchMode = (next) => { setMode(next); setError(''); setNotice(''); setForm({ fullName: '', email: '', password: '' }); setUnlocked(false); };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isForgot) {
        const res = await api.forgotPassword(form.email.trim());
        setNotice(res.message);
        return;
      }
      const u = isLogin
        ? await login(form.email.trim(), form.password)
        : await register(form.fullName.trim(), form.email.trim(), form.password);
      toast(isLogin ? `Welcome, ${u.fullName}!` : `Welcome, ${u.fullName}!`);
      window.location.hash = nextHash(u);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="se-login">
      <aside className="se-login-side">
        <a className="se-brand light" href="#/"><span className="se-brand-mark light"><Icon name="bag" size={18} stroke={2.2} /></span><span>ShopEasy</span></a>
        <div className="se-login-copy">
          <h1>{isLogin || isForgot ? 'Welcome Back!' : 'Join ShopEasy'}</h1>
          <p>{isLogin || isForgot ? 'Login to continue your shopping journey' : 'Create an account to start shopping'}</p>
          <ul>
            <li><Icon name="zap" size={18} /> Exclusive Deals</li>
            <li><Icon name="truck" size={18} /> Faster Checkout</li>
            <li><Icon name="box" size={18} /> Track Your Orders</li>
          </ul>
        </div>
      </aside>

      <div className="se-login-card">
        {user ? (
          <div className="se-login-done">
            <Icon name="check" size={36} />
            <h2>You are logged in as {user.fullName}</h2>
            <a className="se-btn primary block" href="#/">Continue shopping</a>
            <a className="se-btn ghost block" href="#/account">My account</a>
          </div>
        ) : (
          <>
            {!isForgot && (
              <div className="se-auth-tabs" role="tablist">
                <button role="tab" aria-selected={isLogin} className={isLogin ? 'on' : ''} onClick={() => switchMode('login')}>Login</button>
                <button role="tab" aria-selected={!isLogin} className={!isLogin ? 'on' : ''} onClick={() => switchMode('register')}>Sign Up</button>
              </div>
            )}
            <h2>{isForgot ? 'Reset your password' : isLogin ? 'Login to ShopEasy' : 'Create your account'}</h2>
            {isForgot && <p className="se-muted">Enter the email you registered with. We will send you a link to choose a new password.</p>}

            {notice ? (
              <div className="se-notice" role="status">
                <p>{notice}</p>
                <p className="se-tiny">The link works for 30 minutes. Not there? Check your spam folder.</p>
                <button type="button" className="se-btn primary block" onClick={() => switchMode('login')}>Back to login</button>
              </div>
            ) : (
              <form onSubmit={submit} className="se-form" autoComplete="off">
                {mode === 'register' && (
                  <label>Full Name
                    <input required minLength={2} maxLength={100} autoComplete="name" placeholder="Your full name" value={form.fullName} onChange={set('fullName')} />
                  </label>
                )}
                <label>Email Address
                  <input type="email" name="se-email" required autoComplete={isLogin ? 'off' : 'email'} readOnly={isLogin && !unlocked} onFocus={() => setUnlocked(true)} placeholder="Enter your email" value={form.email} onChange={set('email')} />
                </label>
                {!isForgot && (
                  <label>Password
                    <PasswordInput
                      required
                      minLength={isLogin ? undefined : 8}
                      maxLength={72}
                      name="se-password"
                      autoComplete="new-password"
                      readOnly={isLogin && !unlocked}
                      onFocus={() => setUnlocked(true)}
                      placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'}
                      value={form.password}
                      onChange={set('password')}
                    />
                  </label>
                )}
                {isLogin && <p className="se-forgot"><button type="button" className="se-link" onClick={() => switchMode('forgot')}>Forgot Password?</button></p>}
                {error && <p className="se-error" role="alert">{error}</p>}
                <button className="se-btn primary block lg" type="submit" disabled={busy}>
                  {isForgot ? (busy ? 'Sending…' : 'Send reset link') : isLogin ? (busy ? 'Logging in…' : 'Login') : (busy ? 'Creating…' : 'Create account')}
                </button>
                {isForgot && <p className="se-center"><button type="button" className="se-link" onClick={() => switchMode('login')}>← Back to login</button></p>}
              </form>
            )}

            {!isForgot && !notice && (
              <>
                <p className="se-center se-muted">
                  {isLogin
                    ? <>Don&apos;t have an account? <button type="button" className="se-link" onClick={() => switchMode('register')}>Sign Up</button></>
                    : <>Already have an account? <button type="button" className="se-link" onClick={() => switchMode('login')}>Login</button></>}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
