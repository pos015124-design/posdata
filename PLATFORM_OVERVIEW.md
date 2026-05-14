# E-Shop by BHABY GROUP LTD — Platform Overview

> **Version:** 2.0.0  
> **Stack:** React + TypeScript + Node.js + MongoDB  
> **Hosting:** Render (API) + Vercel (Frontend)  
> **Domain:** e-shop.bhabygroup.co.tz  
> **Contact:** info@bhabygroup.co.tz

---

## Table of Contents

1. [What This Platform Is](#1-what-this-platform-is)
2. [Business Model](#2-business-model)
3. [User Roles](#3-user-roles)
4. [The Middleman Model](#4-the-middleman-model)
5. [Seller Onboarding Flow](#5-seller-onboarding-flow)
6. [The Public Storefront](#6-the-public-storefront)
7. [The Delivery System](#7-the-delivery-system)
8. [The POS Terminal](#8-the-pos-terminal)
9. [Revenue & Billing](#9-revenue--billing)
10. [Email Notifications](#10-email-notifications)
11. [Security Architecture](#11-security-architecture)
12. [Data Models](#12-data-models)
13. [API Routes Reference](#13-api-routes-reference)
14. [Frontend Pages Reference](#14-frontend-pages-reference)
15. [Tech Stack Detail](#15-tech-stack-detail)
16. [Environment Variables](#16-environment-variables)
17. [Deployment Architecture](#17-deployment-architecture)

---

## 1. What This Platform Is

E-Shop by BHABY GROUP LTD is a **multi-seller e-commerce marketplace** built for the Tanzanian market. It allows independent sellers (businesses) to list and sell products through a single unified storefront, while BHABY GROUP LTD acts as the central operator — controlling seller access, owning the customer relationship, managing delivery, and collecting platform fees.

Think of it as a combination of three things in one:

- **A marketplace** (like Jumia) — buyers browse and order from multiple sellers in one place
- **A POS + inventory system** (like Shopify) — each seller gets a full back-office dashboard
- **A delivery management hub** — BHABY GROUP LTD assigns riders and tracks every delivery

The platform is a **Progressive Web App (PWA)** — it works in any browser and can be installed on Android and iOS home screens directly from the browser, with offline capability.

---

## 2. Business Model

BHABY GROUP LTD sits in the middle of every transaction:

```
Buyer ──orders──▶ E-Shop Platform ──fulfillment request──▶ Seller
                        │
                        ▼
               BHABY GROUP LTD
               (collects fees, manages delivery, owns customer data)
```

**Key principle:** Sellers never see buyer contact details for online orders. BHABY GROUP LTD owns the customer relationship entirely. This protects the platform's position as the indispensable middleman.

---

## 3. User Roles

The platform has three distinct user types, each with a completely different experience.

### 3.1 Super Admin — BHABY GROUP LTD

The platform owner. There is one super admin account (`info@bhabygroup.co.tz`). Auto-approved on login — never goes through the approval flow.

**Capabilities:**
- Approve, suspend, or delete seller accounts
- View all orders from all sellers with full customer details (name, phone, email, address)
- Assign delivery riders to storefront orders
- Track delivery status through the full workflow
- Confirm seller fee payments
- Waive fees for specific sellers
- View platform-wide analytics (businesses, users, orders, revenue)
- Monitor system health (database, server uptime, memory usage)
- Manage platform settings

**Navigation (sidebar):**
- Super Admin Dashboard (`/super-admin`)
- Business Management (`/business-management`)
- Marketplace (`/store`)
- All Stores (`/stores`)
- Delivery (`/delivery`)
- Settings (`/settings`)

### 3.2 Business Admin — Sellers

Any seller who registers on the platform. Starts unapproved and cannot access the dashboard until the super admin approves them.

**Capabilities after approval:**
- Manage product inventory (add, edit, delete, set stock levels)
- Use the POS terminal for in-person sales
- View fulfillment requests (online orders) — items to prepare only, no customer contact info
- Track revenue, expenses, and reports
- View and pay platform fees
- Manage their public store profile (name, logo, banner, description, hours)
- Export sales data

**Navigation (sidebar):**
- Dashboard (`/dashboard`)
- POS (`/pos`)
- Inventory (`/inventory`)
- Customers (`/customers`)
- Fulfillment (`/orders`)
- Expenses (`/expenses`)
- Reports (`/reports`)
- Suppliers (`/sellers`)
- Settings (`/settings`)
- Billing & Fees (`/billing`)

### 3.3 Buyers — The Public

No account required. Buyers browse the marketplace, add items to cart, and checkout as guests providing only their name, phone number, and optionally email and delivery address. BHABY GROUP LTD handles everything after the order is placed.

---

## 4. The Middleman Model

This is the most critical business logic in the platform. It is enforced at the API level — not just the UI.

### How it works

```
1. Buyer places order at /checkout
         │
         ▼
2. POST /api/public/checkout
   → SaleService.processPublicMultiSellerOrder()
   → Creates one Sale per seller (source: 'storefront')
   → Buyer gets order confirmation email
   → Each seller gets new order email (with customer details for their own fulfillment)
         │
         ▼
3. Seller logs in → sees "Fulfillment Requests"
   → Items to prepare listed
   → Customer name/phone/email/address: HIDDEN
   → "E-Shop managed delivery" badge shown
         │
         ▼
4. Super admin opens Delivery Management
   → Sees full customer details
   → Assigns a rider from the rider pool
   → Buyer gets "Rider Assigned" email with rider name + phone
         │
         ▼
5. Rider collects from seller
   → Admin marks "Collected" → status: out_for_delivery
         │
         ▼
6. Rider delivers to buyer
   → Admin marks "Delivered" → status: delivered
   → Buyer gets delivery confirmation email
   → Sale status updated to: completed
```

### Where the stripping happens (server/routes/salesRoutes.js)

```js
const isSuperAdmin = req.user.role === 'super_admin';
const isStorefront = sale.source === 'storefront';

customerName:    (isSuperAdmin || !isStorefront) ? sale.customerName    : '',
customerEmail:   (isSuperAdmin || !isStorefront) ? sale.customerEmail   : '',
customerPhone:   (isSuperAdmin || !isStorefront) ? sale.customerPhone   : '',
customerAddress: (isSuperAdmin || !isStorefront) ? sale.customerAddress : '',
customerCity:    (isSuperAdmin || !isStorefront) ? sale.customerCity    : '',
isManagedOrder:  isStorefront && !isSuperAdmin,
```

POS sales (in-person) always show customer info to the seller — because the seller is physically serving that customer. Only storefront (online) orders are stripped.

### Delivery status lifecycle

| Status | Meaning | Next action |
|---|---|---|
| `unassigned` | Order received, no rider yet | Assign Rider |
| `assigned` | Rider assigned, not collected yet | Mark Collected |
| `out_for_delivery` | Rider has the items | Mark Delivered / Mark Failed |
| `delivered` | Successfully delivered | — (terminal) |
| `failed` | Delivery failed | Re-assign Rider |

---

## 5. Seller Onboarding Flow

```
Seller visits /register
    │
    ▼
Fills: name, email, password, business name
    │
    ▼
System creates:
  User { role: 'business_admin', isApproved: false }
  Business { status: 'pending', isPublic: false }
    │
    ▼
Admin receives email: "New seller registration: [Business Name]"
    │
    ▼
Seller sees WaitingApproval screen
  → Auto-polls /api/auth/me every 15 seconds
  → Shows 4-step progress timeline
    │
    ▼
Super admin approves from dashboard
  → User.isApproved = true
  → Business.status = 'active', Business.isPublic = true
  → SellerBilling record created: TZS 300,000 registration fee (due in 7 days)
  → Seller receives approval email with login link + fee reminder
    │
    ▼
Seller logs in → full dashboard access
  → Products they add appear in the public marketplace immediately
```

---

## 6. The Public Storefront

The public-facing marketplace. No login required to browse or buy.

### Pages

| Route | Description |
|---|---|
| `/` | Main marketplace — all products from all active stores |
| `/store` | Same as `/` (alias) |
| `/stores` | Store directory — browse all sellers |
| `/store/:slug` | Individual seller's storefront |
| `/cart` | Shopping cart (persisted in localStorage) |
| `/checkout` | Guest checkout form |

### Checkout flow

1. Buyer fills: full name (required), phone (required), email (optional), address, city, notes
2. Selects payment method: Cash on delivery / Mobile money / Card
3. Submits → `POST /api/public/checkout`
4. Backend groups items by seller → creates one `Sale` per seller
5. Each sale gets `source: 'storefront'`, `deliveryStatus: 'unassigned'`
6. Buyer sees order confirmation screen with invoice number(s)
7. Confirmation email sent to buyer (if email provided)
8. New order email sent to each seller

### Multi-seller cart

If a buyer adds products from 3 different sellers, the checkout creates 3 separate sales — one per seller. Each seller only sees their own items. The buyer gets all invoice numbers on the confirmation screen.

---

## 7. The Delivery System

Accessible only to super admin at `/delivery`.

### Riders

BHABY GROUP LTD maintains a pool of delivery riders. Each rider has:
- Name, phone, email
- Vehicle type (Bajaj, Bicycle, Motorbike, etc.)
- Vehicle plate number
- Active/inactive status
- Running total of deliveries completed

Riders are soft-deleted (deactivated, not removed from the database) to preserve delivery history.

### Order management

The Delivery Management page shows all storefront orders with their delivery status. The super admin can:

1. **Assign a rider** — select from active riders, add delivery notes. Buyer gets an email with the rider's name and phone number.
2. **Mark Collected** — rider has picked up the items from the seller.
3. **Mark Delivered** — order successfully delivered. Buyer gets confirmation email. Sale status set to `completed`.
4. **Mark Failed** — delivery failed. Order can be re-assigned to a different rider.

### Smart polling

The delivery page uses `useSmartPolling` — polls every 30 seconds for orders, 60 seconds for riders. Backs off exponentially (up to 5 minutes) when no new data arrives. Pauses when the browser tab is hidden. Resumes immediately when the user returns to the tab.

---

## 8. The POS Terminal

The POS (`/pos`) is for in-person sales at the seller's physical location.

- Seller searches and adds products to the cart
- Sets quantities, applies discounts
- Selects payment method (cash, card, mobile, credit)
- Processes sale → creates a `Sale` with `source: 'pos'`
- Generates a printable receipt with invoice number

POS sales are scoped to the logged-in seller — they never appear in another seller's records. Customer info is visible to the seller for POS sales (since they're serving the customer in person).

---

## 9. Revenue & Billing

### Fee structure

| Fee | Amount | Type | When |
|---|---|---|---|
| Registration | TZS 300,000 | One-time | Due within 7 days of approval |
| Subscription | TZS 5,000/month | Monthly | Ads / sponsorship |

### Payment method

All fees are paid by bank transfer to:
- **Bank:** People's Bank of Zanzibar (PBZ)
- **Account:** 0952509001
- **Account Name:** BHABY GROUP LTD

### Payment flow

1. Seller views their billing records at `/billing`
2. Sees outstanding fees with due dates
3. Transfers the amount to the PBZ account
4. Submits their payment reference number through the platform
5. Super admin sees the submission in the Billing tab
6. Admin confirms payment → record marked as `paid`
7. Admin can also waive fees for specific sellers

### Admin billing view

The super admin sees:
- All billing records across all sellers
- Per-seller summary (total owed, total paid, total waived)
- Platform totals (total collected, total outstanding)
- Ability to confirm or waive any record

---

## 10. Email Notifications

All emails are sent via Nodemailer (SMTP). The system degrades gracefully — if SMTP is not configured, emails are logged to console instead of failing.

| # | Trigger | Recipient | Content |
|---|---|---|---|
| 1 | Seller registers | Super admin | Seller name, email, business name, link to dashboard |
| 2 | Admin approves seller | Seller | Welcome message, fee reminder (TZS 300,000 due in 7 days), login link |
| 3 | Buyer places storefront order | Seller | Items ordered, quantities, total, customer name + phone (for seller's reference) |
| 4 | Buyer places storefront order | Buyer | Order confirmation, invoice number(s), total, payment method note |
| 5 | Admin assigns rider | Buyer | Rider name, rider phone number, order total, safety note |
| 6 | Admin marks delivered | Buyer | Delivery confirmation, invoice number, total paid, thank you message |
| 7 | Legacy: password reset | User | Reset link (1 hour expiry) |

All emails use a consistent branded HTML template:
- Blue-to-purple gradient header with "E-Shop / by BHABY GROUP LTD"
- White card body with structured content
- Gray footer with copyright and "do not reply" notice

---

## 11. Security Architecture

### Authentication

- **JWT access tokens** — 24 hour expiry, signed with `JWT_SECRET`
- **Refresh tokens** — 7 day expiry, signed with `REFRESH_TOKEN_SECRET`
- Tokens carry: `userId`, `email`, `role`, `tenantId`, `businessId`
- `/api/auth/me` endpoint allows unapproved users to poll their own approval status without full auth middleware

### Account protection

- **Account lockout** — 5 failed login attempts triggers a 30-minute lock
- **Rate limiting:**
  - Auth endpoints: 10 requests per 15 minutes per IP
  - Upload endpoints: 30 requests per 15 minutes per IP
  - All other API: 100 requests per 15 minutes per IP
- Preflight (OPTIONS) requests are excluded from rate limiting

### HTTP security

- **Helmet** — sets 14 security-related HTTP headers
- **CORS** — configurable origin allowlist via `ALLOWED_ORIGINS` env var; permissive by default in development
- **mongo-sanitize** — strips `$` and `.` from request bodies to prevent NoSQL injection
- **HPP** — prevents HTTP parameter pollution attacks
- **Compression** — gzip all responses

### Logging

Three separate log streams:
- **Application log** — general request/response logging (Pino)
- **Security log** — login attempts, failed auth, blocked origins
- **Audit log** — every login, registration, approval, permission change with timestamp and IP

### Role enforcement

Every protected route checks `req.user.role`. Super admin routes use a local `requireSuperAdmin` middleware. Business admin routes use `requireUser` from the shared auth middleware. Customer data stripping is enforced at the data layer, not just the UI.

---

## 12. Data Models

### User
```
email, password (bcrypt, 12 rounds), firstName, lastName
role: super_admin | business_admin | staff | customer
tenantId, businessId (ref: Business)
isApproved, isActive, isSuspended
permissions: { dashboard, pos, inventory, customers, staff, reports, settings, platformManagement, ... }
lastLogin, loginCount, failedLoginAttempts, accountLockedUntil
```

### Business (Store Profile)
```
name, slug (unique URL identifier), description, tagline
email, phone, website
address: { street, city, state, zipCode, country }
category: retail | restaurant | services | electronics | clothing | health | ...
logo, banner, colors: { primary, secondary, accent }
businessHours: [{ day, isOpen, openTime, closeTime }]
socialMedia: [{ platform, url }]
ecommerce: { enabled, currency, taxRate, shippingEnabled, pickupEnabled }
status: active | inactive | suspended | pending
isPublic, featured, verified
analytics: { views, orders, revenue, lastOrderDate }
userId (ref: User), tenantId
```

### Sale (Transaction)
```
invoiceNumber (unique)
source: pos | storefront
items: [{ productId, productName, quantity, price, total }]
subtotal, tax, discount, total
paymentMethod: cash | card | credit | mobile
amountPaid, change
status: pending | completed | cancelled
customerName, customerEmail, customerPhone, customerAddress, customerCity
customerId (ref: Customer — optional)

// Delivery fields (storefront orders only)
deliveryStatus: unassigned | assigned | out_for_delivery | delivered | failed
riderId (ref: Rider), riderName, riderPhone
assignedAt, collectedAt, deliveredAt, deliveryNotes

createdBy (ref: User), tenantId
```

### Rider
```
name, phone, email
vehicle (type), vehiclePlate
isActive (soft delete)
totalDeliveries (running count)
createdBy (ref: User)
```

### SellerBilling
```
userId (ref: User), businessId (ref: Business), businessName
type: registration | subscription
amount (TZS), description
status: unpaid | paid | waived
dueDate, paidAt, paidBy
paymentReference (submitted by seller)
```

### Product
```
name, description, price, comparePrice
sku, barcode
stock (quantity), lowStockThreshold
category, images: [url]
isPublished, isFeatured
businessId (ref: Business), createdBy (ref: User)
```

---

## 13. API Routes Reference

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | Public | Login, returns access + refresh tokens |
| POST | `/register` | Public | Register new seller account |
| POST | `/logout` | Public | Clear refresh token |
| POST | `/refresh` | Public | Exchange refresh token for new access token |
| GET | `/me` | Token only | Get current user (used by WaitingApproval polling) |
| GET | `/users` | Admin | List all non-super-admin users |
| GET | `/pending-users` | Admin | List unapproved users |
| PUT | `/approve/:userId` | Admin | Approve seller + activate business + create billing record |
| PUT | `/approve-all-pending` | Admin | Bulk approve all pending sellers |
| PUT | `/suspend/:userId` | Admin | Suspend a user |
| PUT | `/activate/:userId` | Admin | Reactivate a suspended user |
| DELETE | `/users/:userId` | Admin | Delete a user |

### Public Storefront — `/api/public`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | All marketplace products (active stores only) |
| GET | `/categories` | Public | Distinct product categories |
| GET | `/stores` | Public | All public stores |
| GET | `/store/:slug` | Public | Individual store by slug |
| GET | `/store/:slug/products` | Public | Products for a specific store |
| POST | `/checkout` | Public | Guest checkout — creates sales, sends emails |

### Sales — `/api/sales`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Seller | All sales (scoped to seller, customer info stripped for storefront) |
| GET | `/recent` | Seller | Recent sales |
| GET | `/:id` | Seller | Single sale by ID |
| POST | `/payment/process` | Seller | Process POS sale |
| POST | `/` | Seller | Create sale (simple endpoint) |

### Delivery — `/api/delivery`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/riders` | Super admin | List all riders |
| POST | `/riders` | Super admin | Add new rider |
| PUT | `/riders/:id` | Super admin | Update rider |
| DELETE | `/riders/:id` | Super admin | Deactivate rider (soft delete) |
| GET | `/orders` | Super admin | All storefront orders with delivery info |
| PUT | `/orders/:id/assign` | Super admin | Assign rider + email buyer |
| PUT | `/orders/:id/collect` | Super admin | Mark collected from seller |
| PUT | `/orders/:id/deliver` | Super admin | Mark delivered + email buyer |
| PUT | `/orders/:id/fail` | Super admin | Mark delivery failed |

### Billing — `/api/billing`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/info` | Public | Bank account + fee structure |
| GET | `/my` | Seller | Own billing records + summary |
| POST | `/my/submit-payment` | Seller | Submit payment reference |
| GET | `/all` | Super admin | All billing records (filterable) |
| GET | `/summary` | Super admin | Per-seller billing summary |
| PUT | `/:id/confirm` | Super admin | Confirm payment received |
| PUT | `/:id/waive` | Super admin | Waive a fee |
| POST | `/create-registration` | Super admin | Manually create registration fee |

### Platform — `/api/platform`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/analytics` | Super admin | Platform-wide stats (businesses, users, orders, revenue) |
| GET | `/health` | Super admin | Database + server health |
| GET | `/storefront-health` | Super admin | Active stores, published SKUs, stores with 0 products |
| GET | `/stats` | Super admin | Quick counts |
| GET | `/settings` | Super admin | Platform settings |
| PUT | `/settings` | Super admin | Update platform settings |
| POST | `/admin` | Public* | Create super admin (only if none exists) |

### Business — `/api/business`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Seller | Get own business profile |
| PUT | `/:id` | Seller | Update business profile |
| POST | `/link-my-business` | Seller | Link user to existing business |

### Products — `/api/products`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Seller | Own products |
| POST | `/` | Seller | Create product |
| PUT | `/:id` | Seller | Update product |
| DELETE | `/:id` | Seller | Delete product |

---

## 14. Frontend Pages Reference

| Route | Page | Access | Description |
|---|---|---|---|
| `/` | Store | Public | Main marketplace |
| `/about` | LandingPage | Public | About BHABY GROUP LTD |
| `/login` | Login | Public (redirect if logged in) | Login form |
| `/register` | Register | Public (redirect if logged in) | Seller registration |
| `/store` | Store | Public | Marketplace (alias of `/`) |
| `/stores` | StoreDirectory | Public | All public stores |
| `/store/:slug` | IndividualStore | Public | Single seller storefront |
| `/cart` | Cart | Public | Shopping cart |
| `/checkout` | Checkout | Public | Guest checkout |
| `/dashboard` | Dashboard | Seller | Sales overview, quick stats |
| `/pos` | POS | Seller | Point of sale terminal |
| `/inventory` | Inventory | Seller | Product management |
| `/customers` | Customers | Seller | Customer records |
| `/orders` | Orders | Seller | Fulfillment requests |
| `/expenses` | Expenses | Seller | Expense tracking |
| `/reports` | Reports | Seller | Analytics and reports |
| `/sellers` | Sellers | Seller | Supplier management |
| `/settings` | Settings | Seller + Admin | Account and store settings |
| `/billing` | SellerBilling | Seller | Fee records and payment |
| `/super-admin` | SuperAdminDashboard | Super admin | Platform overview |
| `/business-management` | BusinessManagement | Super admin | Manage all businesses |
| `/delivery` | DeliveryManagement | Super admin | Riders + order delivery |

---

## 15. Tech Stack Detail

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6.2 | Build tool + dev server |
| React Router | 7.3 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Radix UI | Various | Accessible UI primitives (dialogs, tabs, dropdowns) |
| Lucide React | 0.460 | Icon library |
| Recharts | 2.15 | Charts and analytics graphs |
| React Hook Form | 7.54 | Form state management |
| Zod | 3.24 | Schema validation |
| Axios | 1.7 | HTTP client |
| vite-plugin-pwa | 0.21 | PWA manifest + service worker |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥18 | Runtime |
| Express | 4.21 | HTTP framework |
| MongoDB | — | Database |
| Mongoose | 8.9 | ODM (Object Document Mapper) |
| JWT (jsonwebtoken) | 9.0 | Authentication tokens |
| bcryptjs | 2.4 | Password hashing (12 rounds) |
| Nodemailer | 7.0 | Email sending |
| Cloudinary | 2.5 | Image storage and CDN |
| Helmet | 7.1 | HTTP security headers |
| express-rate-limit | 7.4 | Rate limiting |
| express-mongo-sanitize | 2.2 | NoSQL injection prevention |
| HPP | 0.2 | HTTP parameter pollution prevention |
| Compression | 1.7 | Gzip response compression |
| Multer | 2.1 | File upload handling |
| Pino | 9.5 | Structured logging |
| Winston | 3.17 | Audit and security logging |

---

## 16. Environment Variables

### Server (`server/.env`)

```env
# Database
DATABASE_URL=mongodb+srv://...

# Auth
JWT_SECRET=your-long-random-secret
REFRESH_TOKEN_SECRET=another-long-random-secret

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="E-Shop — BHABY GROUP LTD" <noreply@bhabygroup.co.tz>
ADMIN_EMAIL=info@bhabygroup.co.tz

# Cloudinary (product images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS
FRONTEND_URL=https://e-shop.bhabygroup.co.tz
# or: ALLOWED_ORIGINS=https://e-shop.bhabygroup.co.tz,https://app.vercel.app

# Server
PORT=3001
NODE_ENV=production
```

### Client (`client/.env.production`)

```env
VITE_API_URL=https://posdata-73sd.onrender.com
```

---

## 17. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BUYER / SELLER                        │
│              Browser or PWA (installed)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (CDN)                          │
│         client/dist — React SPA + PWA assets            │
│         e-shop.bhabygroup.co.tz                         │
└──────────────────────┬──────────────────────────────────┘
                       │ API calls (HTTPS)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    RENDER                                │
│         Node.js + Express server                        │
│         posdata-73sd.onrender.com                       │
│                                                         │
│  Rate limiter → CORS → Helmet → Routes → MongoDB        │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   MongoDB Atlas   Cloudinary    SMTP
   (database)      (images)      (emails)
```

### PWA capabilities (current)
- Installable on Android and iOS from browser ("Add to Home Screen")
- App icon (192×192 and 512×512)
- Standalone display mode (no browser chrome when installed)
- Offline-capable shell (service worker caches static assets)

---

*Last updated: May 2026*  
*Maintained by BHABY GROUP LTD — info@bhabygroup.co.tz*
