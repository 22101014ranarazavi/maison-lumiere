# Maison Lumière

[![CI](https://github.com/22101014ranarazavi/maison-lumiere/actions/workflows/ci.yml/badge.svg)](https://github.com/22101014ranarazavi/maison-lumiere/actions/workflows/ci.yml)

A small-batch perfumery shop — a React storefront, a PHP/MySQL API, an admin
console for orders and products, a long-form guide page for every fragrance,
and a built-in fragrance concierge chatbot.

Nothing here depends on an external service: product imagery is generated SVG,
and the concierge is a deterministic rules engine over the live catalogue, so
the whole project runs offline.

```
perfume/
├── backend/    PHP 8.3 API (no framework) + MySQL schema and seed data
├── frontend/   React 19 + Vite storefront and admin console
└── scripts/    Node test and health-check scripts
```

## Features

**Storefront**

- Home page with a spotlight of six fragrances.
- Shop with family filters, gender filter, search, five sort orders and
  removable filter pills.
- Product pages with the note pyramid, price, rating and a link to the guide.
- Cart drawer and cart page with quantity steppers, plus a checkout that
  validates server-side and returns an `LM-XXXXXX` order reference.
- Contact form and newsletter signup.
- A 404 page that stays in character.

**Fragrance guide** — `/fragrances/:id/guide`

- Curated tagline and story, five "at a glance" facts (longevity, sillage,
  best season, best for, format).
- "How it unfolds": the opening, heart and base explained in three acts.
- Note-by-note: every ingredient with its family, mood and a plain-English
  description from the note dictionary.
- Wearing it: application advice and an intensity meter.
- Layering ideas with a suggested partner for each fragrance.
- A per-fragrance FAQ, plus related guides in the same family.

**Fragrance concierge** — the floating chat button (and the navbar button)

- Answers from the live catalogue with no API key and no network call.
- Understands order lookups by reference (`LM-7C2F9A`), single product
  questions, comparisons, note questions, budgets, gifts, bestsellers, season
  and occasion advice, longevity/sillage, layering, format, shipping, returns,
  payment, contact, gender and family discovery — with a graceful fallback.
- Replies carry up to three product cards that link to the product and its
  guide, plus follow-up suggestion chips.

**Admin console** — `/admin`

- Stateless sign-in with an admin key; no user table.
- Dashboard: revenue, orders awaiting payment, unread enquiries, catalogue
  size, newsletter subscribers and recent orders.
- Orders: filter by status, open an order, change its status, add a tracking
  number and an internal note.
- Fragrances: list, search and sort; edit any field with a live bottle preview;
  create and delete products.
- Inbox: customer messages (mark handled) and the newsletter subscriber list.

## Requirements

- PHP 8.1+ (developed on 8.3) with the `pdo_mysql` extension
- MySQL 8 (developed on 8.4)
- Node.js 18+ (developed on 26)

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env          # then set DB_* and ADMIN_KEY
php scripts/setup.php         # create the database, tables and demo data
php scripts/setup.php --fresh # ...or drop everything first (destructive)
php -S 127.0.0.1:8000 router.php
```

The API is now on `http://127.0.0.1:8000`, serving everything under `/api/`.

`.env` values:

| Key           | Purpose                                              |
| ------------- | ---------------------------------------------------- |
| `DB_HOST`     | MySQL host (default `127.0.0.1`)                     |
| `DB_PORT`     | MySQL port (default `3306`)                          |
| `DB_NAME`     | Database name (default `maison_lumiere`)             |
| `DB_USER`     | MySQL user (default `root`)                          |
| `DB_PASS`     | MySQL password (default empty)                       |
| `CORS_ORIGIN` | Origin allowed by CORS (the Vite dev server)         |
| `APP_ENV`     | `development` or `production`                        |
| `ADMIN_KEY`   | The key used to sign in to `/admin`                  |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 (proxies /api to the PHP server)
npm run build    # production bundle in dist/
```

`vite.config.js` proxies `/api` to `http://127.0.0.1:8000`, so the browser only
ever talks to one origin in development. For production, set `VITE_API_BASE`
to the API's public URL.

### 3. Sign in to the admin

Open `http://localhost:5173/admin` and enter the `ADMIN_KEY` from
`backend/.env` (the example key is `lumiere-admin-2026`). The browser stores a
signed, 12-hour token under `maison_admin_token`.

## Testing

The PHP server must be running for the API scripts.

```bash
node scripts/check-services.mjs   # are Vite and the API up?
node scripts/api-smoke-test.mjs   # storefront API (catalogue, orders, contact…)
node scripts/admin-api-test.mjs   # admin API (auth, orders, products, inbox)
node scripts/chat-test.mjs        # concierge intents and validation
```

The admin script is written to be non-destructive: it restores the records it
touches.

## API

All responses are JSON. Success is `{ "success": true, "data": … }`; errors are
`{ "success": false, "message": … }` with a matching HTTP status.

### Public

| Method | Path                       | Purpose                                  |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/api/products`            | Catalogue (filter, search, sort, paging) |
| GET    | `/api/products/{id}`       | One product with its notes               |
| GET    | `/api/products/{id}/guide` | The full fragrance guide                 |
| GET    | `/api/categories`          | Families with product counts             |
| GET    | `/api/orders/{reference}`  | Look up an order by `LM-XXXXXX`          |
| POST   | `/api/orders`              | Place an order                           |
| POST   | `/api/contact`             | Send an enquiry                          |
| POST   | `/api/newsletter`          | Subscribe to the letter                  |
| POST   | `/api/chat`                | One turn with the concierge              |

### Admin

Every admin route needs the `X-Admin-Token` header returned by `login`.

| Method | Path                       | Purpose                          |
| ------ | -------------------------- | -------------------------------- |
| POST   | `/api/admin/login`         | Exchange the key for a token     |
| GET    | `/api/admin/summary`       | Dashboard metrics                |
| GET    | `/api/admin/orders`        | Orders, filterable by status     |
| GET    | `/api/admin/orders/{id}`   | One order with its items         |
| PATCH  | `/api/admin/orders/{id}`   | Status, tracking number, note    |
| GET    | `/api/admin/products`      | Catalogue for the editor         |
| POST   | `/api/admin/products`      | Create a product                 |
| GET    | `/api/admin/products/{id}` | One product for the editor       |
| PATCH  | `/api/admin/products/{id}` | Update a product                 |
| DELETE | `/api/admin/products/{id}` | Remove a product                 |
| GET    | `/api/admin/messages`      | Enquiries                        |
| PATCH  | `/api/admin/messages/{id}` | Mark an enquiry handled          |
| GET    | `/api/admin/subscribers`   | Newsletter list                  |

`POST /api/chat` takes `{ "message": "…" }` and returns
`{ "reply", "intent", "products", "suggestions" }`.

## How the concierge works

`App\Support\Chatbot` loads the whole catalogue once per request (via
`ProductPresenter`), normalises the message to lowercase, accent-free ASCII,
then runs it through a priority-ordered list of intent handlers. The first
handler to claim the message wins:

1. Order status (an `LM-XXXXXX` reference)
2. Greeting, thanks, farewell, help
3. Shipping, returns, payment, contact
4. Comparison, layering, longevity
5. A single product, a single note
6. Gift, budget, bestsellers
7. Season/occasion, format, gender, family or open recommendation
8. Fallback

Matching is deliberately conservative: short words (≤3 letters) must match a
whole word so "hi" never fires inside "this", while longer words act as stems
so "ship" catches "shipping". When a full product name appears in the message,
only that product is considered, so "Cèdre Blanc" cannot drift into "Thé
Blanc". Note matches reuse the same `NoteLibrary` dictionary the guide is built
from, so the bot and the guide always agree.

## Design notes

- **Auth** is a stateless HMAC token: the payload `{ exp }` is signed with
  `ADMIN_KEY` (`base64url(payload).base64url(hmac_sha256(payload))`), valid for
  12 hours, compared with `hash_equals`.
- **Order statuses** are `pending | paid | shipped | cancelled`, with an
  optional tracking number and internal note. Shipping is a flat `$12` and free
  over `$150` (`OrderController`).
- **Images** are a parametric SVG bottle (`PerfumeBottle`) tinted from each
  product's stored colours — no asset pipeline.
- **Guide content** mixes curated columns (`tagline`, `story`, `craft_notes`,
  `longevity`, `sillage`, `best_season`, `occasion`) with generated fallbacks
  (`FragranceGuide`) and the shared note dictionary.
- **Admin edits** submit the whole product payload (no partial updates); a
  blank SKU is auto-generated as `LM-###`.

## Project layout

```
backend/
  public/index.php        route table and API front controller
  router.php              router for PHP's built-in server
  config.php              .env loader and config
  src/
    Controllers/          Product, Category, Order, Contact, Newsletter, Chat,
                          Admin, AdminOrder, AdminProduct
    Support/              ProductPresenter, NoteLibrary, FragranceGuide, Chatbot
    Auth.php              admin token signing and verification
    Http.php              request/response helpers and CORS
    Validator.php         request validation
    Database.php          PDO singleton
  database/               schema.sql and seed.sql
  scripts/setup.php       database bootstrap
frontend/
  src/
    pages/                Home, Shop, ProductDetail, GuidePage, Cart, Checkout,
                          Contact, About, NotFound
    admin/                AdminApp, AdminLayout and the console pages
    components/           Navbar, Footer, ProductCard, PerfumeBottle, CartDrawer,
                          ChatWidget, ToastStack, Stars, Reveal, Spinner
    context/              cart and toast providers
    api/client.js         API client and admin token storage
    styles/               index.css (storefront) and admin.css (console)
scripts/                  test and health-check scripts
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

- **api** — boots MySQL 8.4, seeds the schema, starts the PHP server and runs
  the smoke, admin and concierge test scripts.
- **web** — installs the frontend dependencies and produces a production build.

## License

MIT — see [LICENSE](LICENSE).
