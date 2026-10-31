import Icon from './Icon.jsx';

export default function Footer() {
  return (
    <footer className="se-footer-wrap">
      <div className="se-footer">
        <div className="se-footer-brand">
          <span className="se-brand-mark light"><Icon name="bag" size={22} stroke={2.2} /></span>
          <span>ShopEasy</span>
        </div>
        <p className="se-tagline">Better Shopping <i /> Better Living</p>
        <ul className="se-trust">
          <li><Icon name="shield" size={20} /> Secure Payments</li>
          <li><Icon name="truck" size={20} /> Fast Delivery</li>
          <li><Icon name="returnBox" size={20} /> Easy Returns</li>
          <li><Icon name="headset" size={20} /> 24/7 Support</li>
        </ul>
      </div>
    </footer>
  );
}
