import Footer from './components/Footer.jsx';
import Navbar, { BottomNav } from './components/Navbar.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import AccountPage from './pages/AccountPage.jsx';
import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ListingPage from './pages/ListingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import TrackPage from './pages/TrackPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';

export default function App() {
  const route = useHashRoute();
  const productId = route.startsWith('/product/') ? Number(route.split('/')[2]) : null;
  const trackId = route.startsWith('/track/') ? Number(route.split('/')[2]) : null;

  let page;
  if (route === '/admin/orders') page = <AdminOrdersPage />;
  else if (route === '/admin') page = <AdminPage />;
  else if (route === '/orders') page = <OrdersPage />;
  else if (trackId !== null) page = <TrackPage key={trackId} orderId={trackId} />;
  else if (route === '/wishlist') page = <WishlistPage />;
  else if (route === '/cart') page = <CartPage />;
  else if (route === '/checkout') page = <CheckoutPage />;
  else if (route === '/login') page = <LoginPage />;
  else if (route === '/account') page = <AccountPage />;
  else if (route === '/products') page = <ListingPage />;
  else if (route === '/verify-email') page = <VerifyEmailPage />;
  else if (route === '/reset-password') page = <ResetPasswordPage />;
  else if (productId !== null) page = <ProductPage key={productId} productId={productId} />;
  else page = <HomePage />;

  const bare = route === '/login';          // the login page has its own full-screen layout
  return (
    <div className={`se-app ${route.startsWith('/admin') ? 'is-admin' : ''}`}>
      {!bare && <Navbar route={route} />}
      <main>{page}</main>
      {!bare && <Footer />}
      {!bare && <BottomNav route={route} />}
    </div>
  );
}
