import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { hashParam } from '../hooks/useHashRoute.js';

export default function VerifyEmailPage() {
  const { user, refreshUser, openAuth } = useAuth();
  const [state, setState] = useState({ loading: true, ok: false, message: '' });

  useEffect(() => {
    window.scrollTo(0, 0);
    const token = hashParam('token');
    if (!token) {
      setState({ loading: false, ok: false, message: 'This verification link is incomplete. Please open the link from your email again.' });
      return undefined;
    }
    let cancelled = false;
    api.verifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        setState({ loading: false, ok: true, message: res.message });
        refreshUser().catch(() => {});          // logged in? update the "verified" flag (and hide the banner)
      })
      .catch((e) => { if (!cancelled) setState({ loading: false, ok: false, message: e.message }); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="auth-page">
      <div className="checkout-modal auth-modal">
        {state.loading ? (
          <>
            <p className="eyebrow">EMAIL VERIFICATION</p>
            <h2>Verifying…</h2>
            <p className="muted">Please wait a moment.</p>
          </>
        ) : state.ok ? (
          <>
            <p className="eyebrow">ALL SET</p>
            <h2>Email verified</h2>
            <p className="muted">{state.message}</p>
            <a className="checkout-btn auth-link-btn" href="#/">Continue shopping →</a>
          </>
        ) : (
          <>
            <p className="eyebrow">EMAIL VERIFICATION</p>
            <h2>Link not valid</h2>
            <p className="form-error" role="alert">{state.message}</p>
            {user ? (
              <ResendButton />
            ) : (
              <button type="button" className="checkout-btn" onClick={() => openAuth('login')}>Login to get a new link</button>
            )}
            <p className="tiny"><a href="#/">← Back to shop</a></p>
          </>
        )}
      </div>
    </section>
  );
}

function ResendButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function resend() {
    setBusy(true);
    try { setMessage((await api.resendVerification()).message); } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  }
  return (
    <>
      <button type="button" className="checkout-btn" onClick={resend} disabled={busy}>{busy ? 'Sending…' : 'Send me a new link'}</button>
      {message && <p className="tiny" role="status">{message}</p>}
    </>
  );
}
