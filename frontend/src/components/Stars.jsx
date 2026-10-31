// Small rating pill: "4.3 ★ (1,284)". Renders nothing when there are no ratings yet.
export default function Stars({ rating, count, large = false }) {
  if (!rating || !count) return null;
  const tone = rating >= 4 ? 'good' : rating >= 3 ? 'ok' : 'low';
  return (
    <span className={`rating ${large ? 'rating-lg' : ''}`}>
      <span className={`rating-pill ${tone}`}>{rating.toFixed(1)} ★</span>
      <span className="rating-count">({count.toLocaleString('en-IN')})</span>
    </span>
  );
}

// Row of five stars, filled up to `value` (rounded).
export function StarRow({ value, size = 16 }) {
  const filled = Math.round(value);
  return (
    <span className="star-row" style={{ fontSize: size }} role="img" aria-label={`${filled} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= filled ? 'on' : ''}>★</span>)}
    </span>
  );
}

/** Compact "★★★★☆ (12.4k)" line used on product cards. Renders nothing without ratings. */
export function MiniStars({ rating, count }) {
  if (!rating || !count) return <span className="se-noreviews">No reviews yet</span>;
  const n = count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : count;
  return (
    <span className="se-mini-stars" title={`${rating.toFixed(1)} out of 5`}>
      <StarRow value={rating} size={13} />
      <span>({n})</span>
    </span>
  );
}
