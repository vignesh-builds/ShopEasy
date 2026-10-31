import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FALLBACK_IMAGE, discountPercent, money } from '../utils/format.js';
import Icon from './Icon.jsx';

/**
 * "Select options" pop-up: pick colour + size right on the product tile and add to cart,
 * without leaving the page. (The full product page is one click away via the name / image.)
 */
export default function QuickSelect({ product, onAdd, onClose }) {
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const [color, setColor] = useState(colors[0]?.name || '');
  const [size, setSize] = useState('');
  const [error, setError] = useState('');
  const off = discountPercent(product);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  function submit() {
    if (sizes.length > 0 && !size) { setError('Please select a size to continue.'); return; }
    if (onAdd(product, { size, color }) !== false) onClose();
  }

  return createPortal(
    <div className="se-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="se-modal" role="dialog" aria-modal="true" aria-label={`Choose options for ${product.name}`}>
        <button className="se-modal-close" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
        <div className="se-modal-head">
          <img src={product.imageUrl || FALLBACK_IMAGE} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }} />
          <div>
            <h3>{product.name}</h3>
            <p className="se-price-row"><b>{money(product.price)}</b>{off > 0 && <s>{money(product.mrp)}</s>}{off > 0 && <span className="se-off">{off}% off</span>}</p>
          </div>
        </div>

        {colors.length > 0 && (
          <div className="se-option">
            <p className="se-option-label">Color <b>{color}</b></p>
            <div className="se-swatches" role="radiogroup" aria-label="Color">
              {colors.map((c) => (
                <button key={c.name} type="button" role="radio" aria-checked={color === c.name} aria-label={c.name} title={c.name}
                  className={color === c.name ? 'on' : ''} onClick={() => setColor(c.name)}>
                  <span style={{ background: c.hex }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="se-option">
            <p className="se-option-label">Size <b>{size}</b></p>
            <div className="se-sizes" role="radiogroup" aria-label="Size">
              {sizes.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={size === s} className={size === s ? 'on' : ''}
                  onClick={() => { setSize(s); setError(''); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="se-error" role="alert">{error}</p>}
        <button className="se-btn primary block lg" onClick={submit}>Add to Cart</button>
        <a className="se-link se-modal-more" href={`#/product/${product.id}`} onClick={onClose}>View full details</a>
      </div>
    </div>,
    document.body,
  );
}
