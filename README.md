# ShopEasy – Java Full Stack (Spring Boot + React + PostgreSQL + JWT)

```
ShopEasy-FullStack/
├── backend/                     Spring Boot 3 REST API (port 8080)
│   ├── pom.xml
│   └── src/main/java/com/shopeasy/
│       ├── controller/          HTTP layer  – ProductController, OrderController, AuthController, AdminController
│       ├── service/             business logic – ProductService, OrderService, AuthService, AdminService
│       ├── repository/          Spring Data JPA – ProductRepository, OrderRepository, AppUserRepository
│       ├── entity/              JPA entities – Product, CustomerOrder, OrderItem, AppUser
│       ├── dto/                 request/response records (what goes over the wire)
│       ├── exception/           ApiException + GlobalExceptionHandler  ->  { "error": "message" }
│       ├── security/            JwtService, JwtAuthFilter
│       └── config/              SecurityConfig (roles + CORS), DataSeeder, AdminSeeder
├── frontend/                    React 19 + Vite (port 5173)
│   └── src/
│       ├── api/client.js        the ONLY place that calls the backend (adds the JWT, parses errors)
│       ├── context/             AuthContext, CartContext, ToastContext
│       ├── components/          Navbar, ProductCard, CartDrawer, CheckoutModal, AuthModal, ...
│       ├── pages/               StorefrontPage, AdminPage
│       └── hooks/, utils/
└── docker-compose.yml           optional PostgreSQL
```

## Run it (two terminals)

**Prerequisites:** JDK 17+, Maven, Node.js 18+, PostgreSQL.

### 0. Database
Either `docker compose up -d` (uses the defaults below) or create it yourself:
```sql
CREATE DATABASE shopeasy;
```
Defaults: user `postgres`, password `postgres`, `jdbc:postgresql://localhost:5432/shopeasy`. Override with
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

### 1. Backend – http://localhost:8080
```bash
cd backend
mvn spring-boot:run          # or run-windows.bat / ./run-mac-linux.sh
```
Tables are created automatically and 6 sample products are inserted on first start.
First admin account: **admin@shop.com / Admin@123** (change with `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
If that email already exists in the database with another password, it is reset to this value on every start (set `ADMIN_RESET_PASSWORD=false` to turn that off).
Log in with the normal **Login** button; an admin then sees an **Admin dashboard** button in the top bar.

### 2. Frontend – http://localhost:5173
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**. (Not 8080 – that is only the API.)

## How frontend and backend are connected
- In development, Vite forwards every `http://localhost:5173/api/...` request to `http://localhost:8080` (see `frontend/vite.config.js`), so the browser sees one origin and no CORS is involved.
- The backend also allows `http://localhost:5173` through CORS (`app.cors.allowed-origins` / `CORS_ORIGINS`), so calling the API directly works too.
- Login returns a JWT; the React app stores it in `localStorage` and sends `Authorization: Bearer <token>` on every request. If the server answers 401 for a logged-in user, the app logs out automatically.
- Every API error is `{ "error": "message" }` and is shown as-is in the UI.

### Production build
```bash
cd frontend
echo VITE_API_URL=https://api.example.com/api > .env.production    # where the backend lives
npm run build                                                      # static files in frontend/dist
```
Then set the backend's `CORS_ORIGINS=https://your-frontend-domain`, a random `JWT_SECRET` (32+ bytes) and real DB credentials.

## Product detail page (Amazon / Flipkart style)
Click any product image or name -> `#/product/{id}`: image gallery with thumbnails + hover zoom, brand, rating, price / MRP / % off,
colour swatches, size buttons (required when the product has sizes), stock status, quantity, **Add to bag**, **Buy now**,
PIN-code delivery estimate, highlights, specifications and similar products.
Chosen size/colour are kept per cart line, sent with the order and validated by the backend.
Admin -> *Product page details* fills brand, MRP, extra images, colours (`Name:#hex`), sizes, highlights, specifications.
Existing databases get the new columns automatically (`ddl-auto=update`) and the 6 sample products are enriched on next start.

## Customer reviews
Logged-in users can rate (1-5 stars) and review a product once; submitting again edits it, and they can delete it.
The product page shows the real average, the 5-to-1 star breakdown bars and all reviews. A review gets a
**Verified purchase** badge when the user bought that product while logged in. Product cards use the same real rating.
(The made-up sample ratings from the first version are removed automatically on start.)

## My orders
Orders placed while logged in are linked to the account. **My orders** (top bar) shows them newest first with a
Placed -> Shipped -> Delivered tracker, size/colour, a *Buy again* button (re-adds items using today's price and stock) and,
once delivered, a *Write a product review* link. Admin -> Recent orders has a *Mark shipped* / *Mark delivered* button
(only one step forward at a time). Guest orders are not shown to anyone except the admin.

## Email: order mails, verify email, forgot password
All mails are HTML + plain text and are sent in the background, so checkout never waits for the mail server and a mail
problem never breaks an order.

| Mail | When |
|---|---|
| Order confirmation | right after an order is saved (sent only after the database commit) |
| Order shipped / delivered | when the admin clicks *Mark shipped* / *Mark delivered* |
| Verify your email | on registration (link valid 24 h) - also *Resend email* in the yellow banner |
| Reset password | *Forgot password?* in the login box (link valid 30 min, one use) |

**Local development needs no setup.** While no SMTP server is configured the backend *prints* every mail, including its
links, in the console - copy the verify / reset link from there into the browser.

**To really send mails** set these environment variables before starting the backend (pick one provider):
```
# SendGrid
SPRING_MAIL_HOST=smtp.sendgrid.net  SPRING_MAIL_PORT=587  SPRING_MAIL_USERNAME=apikey  SPRING_MAIL_PASSWORD=<SendGrid API key>
# Amazon SES (SMTP credentials from the SES console)
SPRING_MAIL_HOST=email-smtp.ap-south-1.amazonaws.com  SPRING_MAIL_PORT=587  SPRING_MAIL_USERNAME=...  SPRING_MAIL_PASSWORD=...
# Gmail (needs an "app password")
SPRING_MAIL_HOST=smtp.gmail.com  SPRING_MAIL_PORT=587  SPRING_MAIL_USERNAME=you@gmail.com  SPRING_MAIL_PASSWORD=<app password>

MAIL_FROM="ShopEasy <orders@yourdomain.com>"   # must be a sender verified with the provider
FRONTEND_URL=https://your-shop-domain.com       # used for the links inside the mails
```
Local mail inbox without a real account: `docker compose --profile mail up -d`, then set `SPRING_MAIL_HOST=localhost`,
`SPRING_MAIL_PORT=1025`, `MAIL_SMTP_AUTH=false`, `MAIL_SMTP_STARTTLS=false` and open http://localhost:8025.

Security notes: only a SHA-256 hash of each token is stored; *forgot password* always answers the same message (it does not
reveal which emails are registered); a new mail of the same kind to the same account is held back for 60 seconds.
Login does not require a verified email (a banner reminds the shopper). Note that with `ADMIN_RESET_PASSWORD=true` the
admin password is reset to `ADMIN_PASSWORD` on every start - turn that off in production.

## Product page suggestions
Under the product details the page shows up to three rows (scroll with the arrows):
- **Customers also bought** - products that were in the same orders as this one (appears once real orders exist).
- **You may also like** - same category / brand / similar price / good rating, topped up with other in-stock products, so it is never empty.
- **Recently viewed** - the last products this shopper opened (kept in the browser).
API: `GET /api/products/{id}/recommendations` -> `{ alsoBought: [...], similar: [...] }`.

## REST API
| Method & path | Access | Purpose |
|---|---|---|
| `GET /api/health` | public | health check |
| `GET /api/products?q=&category=` , `GET /api/products/{id}` , `GET /api/categories` | public | catalogue |
| `POST /api/orders` | public | demo checkout (reduces stock) |
| `POST /api/auth/register` , `POST /api/auth/login` | public | returns `{ token, user }` |
| `GET /api/auth/me` | any logged-in user | current user (`emailVerified` included) |
| `POST /api/auth/verify-email` `{token}` | public | confirm the email (link from the mail) |
| `POST /api/auth/resend-verification` | any logged-in user | send the verification mail again (429 if asked within a minute) |
| `POST /api/auth/forgot-password` `{email}` | public | always `200`, sends a reset mail if the account exists |
| `POST /api/auth/reset-password` `{token, password}` | public | set a new password with the token from the mail |
| `GET /api/products/{id}/recommendations` | public | product-page suggestions |
| `GET /api/products/{id}/reviews` | public | rating summary + reviews (+ your own review when logged in) |
| `POST /api/products/{id}/reviews` , `DELETE /api/products/{id}/reviews/mine` | any logged-in user | write / edit / delete your review |
| `GET /api/orders/mine` | any logged-in user | your own orders |
| `PUT /api/admin/orders/{id}/status` | ADMIN | `{ "status": "SHIPPED" }` then `"DELIVERED"` |
| `GET /api/orders/{id}` | ADMIN | one order with items |
| `GET /api/admin/summary` , `GET /api/admin/orders` | ADMIN | dashboard data |
| `POST /api/admin/products` , `PUT/DELETE /api/admin/products/{id}` | ADMIN | manage products |

Status codes: 400 validation / invalid or expired token, 401 not logged in / bad token, 403 not an admin, 404 not found, 409 duplicate email, 429 mail requested too often.

## Tests
`cd backend && mvn test` – runs against an in-memory H2 database (no PostgreSQL needed). Covers public API, CORS for the React origin, JWT login, USER vs ADMIN access, product CRUD, checkout reducing stock, the error format, and (in `EmailAndRecommendationTests`) email verification, forgot / reset password, order confirmation / shipped / delivered mails and the product recommendations.

## Notes
- Checkout is a demo: no payments, and `POST /api/orders` is public by design.
- Prices are `double` for simplicity; use `BigDecimal`/paise for a real shop.
- JWT is kept in `localStorage` (simple, but readable by any XSS). For production consider an httpOnly cookie.


## Features
- **Reviews** - logged-in users rate (1-5 stars) and write one review per product; the product page shows the real average and the 5★..1★ breakdown bars. Cards show a rating only once real reviews exist.
- **Wishlist** - tap the ♡ on a product card or product page, or open **Wishlist** in the top bar. Logged-in users: saved in the database (`/api/wishlist`). Guests: saved in the browser (localStorage) and moved into the account automatically when they log in.

## Troubleshooting
**`404 /api/products/1/reviews` in the browser console** - an older backend build is still running on port 8080.
Stop it (Ctrl+C / close the old terminal), then start this project's backend with `mvn clean spring-boot:run`
(the run scripts already do this). Check `http://localhost:8080/api/health` - it must show `"reviews":"enabled"`.


## New UI (10 screens)
Home, Product listing (filters + sort), Product details (tabs), Cart, Login / Sign up, Checkout (Delivery > Payment > Review),
My orders + Order tracking, Account (profile + saved addresses), Wishlist, and a mobile layout with a bottom tab bar.
Routes: `#/`, `#/products`, `#/product/:id`, `#/cart`, `#/login`, `#/checkout`, `#/orders`, `#/track/:id`, `#/account`, `#/wishlist`.
Styles: `frontend/src/design.css` (new, prefix `se-`), `legacy.css` (admin pages, reviews, e-mail pages).
Notes: saved addresses are kept in the browser (the API has no address book); the chosen payment method is appended to the
order's address text; Express / Same-day delivery and Google / Facebook login are shown but not active (no backend support).
