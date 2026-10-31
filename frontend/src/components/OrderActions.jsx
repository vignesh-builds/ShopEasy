import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { shortDate } from '../utils/format.js';

export const RETURN_WINDOW_DAYS = 7;   // keep in sync with OrderService.RETURN_WINDOW_DAYS on the server
const DAY = 24 * 60 * 60 * 1000;

const CANCEL_REASONS = ['Ordered by mistake', 'Found a better price', 'Delivery is taking too long', 'Want to change size / colour / address', 'Other'];
const RETURN_REASONS = ['Item is damaged or defective', 'Wrong item received', 'Size / fit issue', 'Not as described', 'Changed my mind', 'Other'];

/** Days left to return a delivered order (0 or less = window closed). */
export function returnDaysLeft(order) {
  const since = new Date(order.deliveredAt || order.createdAt).getTime();
  return Math.ceil((since + RETURN_WINDOW_DAYS * DAY - Date.now()) / DAY);
}

export const canCancel = (order) => order.status === 'PLACED';
export const canReturn = (order) => order.status === 'DELIVERED' && returnDaysLeft(order) > 0;

/**
 * Cancel / return buttons for one order, with the small reason form.
 * Cancel: while the order is still PLACED (pending / processing). Return: once DELIVERED, inside the return window.
 */
export default function OrderActions({ order, onChanged }) {
  const toast = useToast();
  const [mode, setMode] = useState(null);          // null | 'cancel' | 'return'
  const [choice, setChoice] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isCancel = mode === 'cancel';
  const reasons = isCancel ? CANCEL_REASONS : RETURN_REASONS;

  function open(next) { setMode(next); setChoice(''); setDetails(''); setError(''); }

  async function submit(e) {
    e.preventDefault();
    if (!choice) { setError('Please choose a reason.'); return; }
    if ((choice === 'Other' || details.trim()) && details.trim().length < 3) { setError('Please describe the reason in a few words.'); return; }
    const reason = [choice, details.trim()].filter(Boolean).join(': ');
    setBusy(true);
    setError('');
    try {
      if (isCancel) await api.cancelOrder(order.id, reason);
      else await api.returnOrder(order.id, reason);
      toast(isCancel ? `Order #${order.id} was cancelled` : `Return requested for order #${order.id}`);
      setMode(null);
      await onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {canCancel(order) && mode !== 'cancel' && <button className="se-btn danger" onClick={() => open('cancel')}>Cancel order</button>}
      {canReturn(order) && mode !== 'return' && <button className="se-btn outline" onClick={() => open('return')}>Return / refund</button>}

      {order.status === 'DELIVERED' && !canReturn(order) && <small className="se-muted">Return window closed ({RETURN_WINDOW_DAYS} days after delivery)</small>}
      {canReturn(order) && !mode && <small className="se-muted">Returnable for {returnDaysLeft(order)} more day{returnDaysLeft(order) === 1 ? '' : 's'}</small>}

      {order.status === 'CANCELLED' && <p className="se-return-note bad">Order cancelled{order.cancelReason ? ` · ${order.cancelReason}` : ''}. Items are back in stock.</p>}
      {order.status === 'RETURN_REQUESTED' && <p className="se-return-note">Return requested{order.returnRequestedAt ? ` on ${shortDate(order.returnRequestedAt)}` : ''} · {order.returnReason}. We will email you once it is reviewed.</p>}
      {order.status === 'RETURN_APPROVED' && <p className="se-return-note ok">Return approved. Your refund of ₹{Math.round(order.total).toLocaleString('en-IN')} is being processed.</p>}
      {order.status === 'RETURN_REJECTED' && <p className="se-return-note bad">Your return request was declined. Please contact support if you have questions.</p>}
      {order.status === 'REFUNDED' && <p className="se-return-note ok">Refund issued for this order.</p>}

      {mode && (
        <form className="se-reason" onSubmit={submit}>
          <h4>{isCancel ? `Cancel order #${order.id}?` : `Return items from order #${order.id}`}</h4>
          <select aria-label="Reason" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Select a reason…</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea aria-label="More details" maxLength={300} placeholder="Tell us more (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
          {error && <p className="se-error" role="alert">{error}</p>}
          <div className="se-reason-actions">
            <button type="submit" className={`se-btn ${isCancel ? 'danger solid' : 'primary'}`} disabled={busy}>
              {busy ? 'Please wait…' : isCancel ? 'Yes, cancel order' : 'Submit return request'}
            </button>
            <button type="button" className="se-btn ghost" onClick={() => setMode(null)} disabled={busy}>{isCancel ? 'Keep order' : 'Never mind'}</button>
          </div>
        </form>
      )}
    </>
  );
}
