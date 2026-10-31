import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Slim bar under the top bar: shown to logged-in shoppers whose email is not verified yet.
export default function VerifyBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [hidden, setHidden] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified !== false || user.role === 'ADMIN' || hidden) return null;

  async function resend() {
    setSending(true);
    try {
      const res = await api.resendVerification();
      toast(res.message);
    } catch (err) {
      toast(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="verify-banner" role="status">
      <span>Please verify your email address. We sent a link to <b>{user.email}</b>.</span>
      <button type="button" onClick={resend} disabled={sending}>{sending ? 'Sending…' : 'Resend email'}</button>
      <button type="button" className="verify-close" aria-label="Dismiss" onClick={() => setHidden(true)}>×</button>
    </div>
  );
}
