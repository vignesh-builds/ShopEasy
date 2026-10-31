import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { StarRow } from './Stars.jsx';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Rating summary + write/edit form + list. `data` is the API response; onData() hands back updated data. */
export default function Reviews({ productId, data, loadError, onData }) {
  const { user, openAuth } = useAuth();
  const toast = useToast();

  const summary = data?.summary;
  const mine = data?.myReview || null;

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function resetForm() {
    setRating(mine?.rating || 0);
    setTitle(mine?.title || '');
    setComment(mine?.comment || '');
    setEditing(false);
    setError('');
  }

  // Pre-fill the form with the user's existing review whenever it changes (or on login / logout).
  useEffect(resetForm, [mine?.id, mine?.rating, mine?.title, mine?.comment, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    if (rating < 1) { setError('Please select a star rating.'); return; }
    if (!comment.trim()) { setError('Please write a few words about the product.'); return; }
    setBusy(true);
    setError('');
    try {
      const next = await api.saveReview(productId, { rating, title: title.trim(), comment: comment.trim() });
      onData(next);
      toast(mine ? 'Your review was updated' : 'Thanks! Your review was posted');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete your review?')) return;
    setBusy(true);
    try {
      onData(await api.deleteMyReview(productId));
      toast('Your review was deleted');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showForm = user && (!mine || editing);
  const shown = hover || rating;

  return (
    <div className="reviews" id="reviews">
      <h2>Customer reviews</h2>

      {loadError && <p className="form-error">Could not load reviews: {loadError}</p>}
      {!data && !loadError && <p className="muted">Loading reviews…</p>}

      {data && (
        <div className="reviews-grid">
          {/* ---- summary ---- */}
          <div className="review-summary">
            {summary.count === 0 ? (
              <>
                <p className="big-rating">–</p>
                <p className="muted">No ratings yet. Be the first to review this product!</p>
              </>
            ) : (
              <>
                <div className="big-rating-row">
                  <span className="big-rating">{summary.average.toFixed(1)}</span>
                  <div>
                    <StarRow value={summary.average} size={20} />
                    <p className="muted">{summary.count.toLocaleString('en-IN')} rating{summary.count === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="breakdown">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const n = summary.breakdown[star] || 0;
                    const pct = Math.round((n / summary.count) * 100);
                    return (
                      <div className="breakdown-row" key={star}>
                        <span>{star} ★</span>
                        <div className="bar" role="img" aria-label={`${pct}% gave ${star} stars`}><i style={{ width: `${pct}%` }} /></div>
                        <span className="pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ---- write / edit ---- */}
            <div className="write-review">
              {!user && (
                <>
                  <h3>Share your thoughts</h3>
                  <p className="muted">Log in to rate and review this product.</p>
                  <button className="checkout-btn" onClick={() => openAuth('login')}>Login to write a review</button>
                </>
              )}

              {user && mine && !editing && (
                <>
                  <h3>Your review</h3>
                  <StarRow value={mine.rating} />
                  <div className="my-review-actions">
                    <button className="mini-btn" onClick={() => setEditing(true)}>Edit</button>
                    <button className="mini-btn danger" disabled={busy} onClick={remove}>Delete</button>
                  </div>
                </>
              )}

              {showForm && (
                <form onSubmit={submit} noValidate>
                  <h3>{mine ? 'Edit your review' : 'Write a review'}</h3>
                  <div className="star-picker" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        type="button"
                        key={i}
                        role="radio"
                        aria-checked={rating === i}
                        aria-label={`${i} star${i > 1 ? 's' : ''}`}
                        className={i <= shown ? 'on' : ''}
                        onMouseEnter={() => setHover(i)}
                        onClick={() => setRating(i)}
                      >★</button>
                    ))}
                    <span className="pick-label">{LABELS[shown]}</span>
                  </div>
                  <label>Headline (optional)
                    <input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's most important to know?" />
                  </label>
                  <label>Your review
                    <textarea maxLength={2000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like or dislike? How is the quality?" />
                  </label>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <div className="my-review-actions">
                    <button className="checkout-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : mine ? 'Update review' : 'Submit review'}</button>
                    {editing && <button type="button" className="mini-btn" onClick={resetForm}>Cancel</button>}
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ---- list ---- */}
          <div className="review-list">
            {data.reviews.length === 0 && summary.count === 0 && <p className="muted">No reviews yet.</p>}
            {data.reviews.map((r) => (
              <article className="review" key={r.id}>
                <div className="review-head">
                  <span className="avatar" aria-hidden="true">{r.userName.charAt(0).toUpperCase()}</span>
                  <b>{r.userName}</b>
                  {r.mine && <span className="badge you">You</span>}
                </div>
                <div className="review-stars">
                  <StarRow value={r.rating} size={14} />
                  {r.title && <b>{r.title}</b>}
                </div>
                <p className="review-meta">
                  Reviewed on {fmtDate(r.createdAt)}
                  {r.verifiedPurchase && <span className="badge verified">✓ Verified purchase</span>}
                </p>
                <p className="review-text">{r.comment}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
