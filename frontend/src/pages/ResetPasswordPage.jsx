import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { hashParam } from '../hooks/useHashRoute.js';

export default function ResetPasswordPage() {
  const { openAuth } = useAuth();
  const [token] = useState(() => hashParam('token'));
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.resetPassword(token, form.password);
      setDone(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="checkout-modal auth-modal">
        <p className="eyebrow">YOUR SHOPEASY ACCOUNT</p>
        {done ? (
          <>
            <h2>Password changed</h2>
            <p className="muted">{done}</p>
            <button type="button" className="checkout-btn" onClick={() => { window.location.hash = '#/'; openAuth('login'); }}>Login →</button>
          </>
        ) : !token ? (
          <>
            <h2>Link not valid</h2>
            <p className="form-error" role="alert">This reset link is incomplete. Please open the link from your email again, or ask for a new one.</p>
            <button type="button" className="checkout-btn" onClick={() => { window.location.hash = '#/'; openAuth('forgot'); }}>Send me a new link</button>
          </>
        ) : (
          <>
            <h2>Choose a new password</h2>
            <p className="muted">Use at least 8 characters.</p>
            <form onSubmit={submit}>
              <label>New password
                <PasswordInput name="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} />
              </label>
              <label>Confirm new password
                <PasswordInput name="confirm" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Type it again" value={form.confirm} onChange={set('confirm')} />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              {error && /invalid or has expired/i.test(error) && (
                <p className="tiny"><button type="button" className="link-btn" onClick={() => { window.location.hash = '#/'; openAuth('forgot'); }}>Get a new reset link</button></p>
              )}
              <button className="checkout-btn" type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Change password →'}</button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
