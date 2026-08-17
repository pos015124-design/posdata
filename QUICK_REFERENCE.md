# Quick Reference - Deployment & Features

## 🚀 VPS DEPLOYMENT (TL;DR)

### Prerequisites
```bash
# SSH to your VPS
ssh root@your_vps_ip

# System setup
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs npm mongodb-org nginx certbot
npm install -g pm2
```

### Clone & Setup
```bash
cd /var/www
git clone https://github.com/pos015124-design/posdata.git
cd posdata

# Create .env file with:
# DATABASE_URL=your_mongodb_url
# JWT_SECRET=your_secret_key
# VITE_API_URL=https://yourdomain.com
# (See VPS_DEPLOYMENT_GUIDE.md for full env template)
```

### Build & Deploy
```bash
# Backend
npm install

# Frontend
cd client && npm install && npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Setup
```bash
# Copy nginx config from VPS_DEPLOYMENT_GUIDE.md
# Set up SSL with certbot
certbot certonly --standalone -d yourdomain.com

# Restart Nginx
systemctl restart nginx
```

### Continuous Deployment
```bash
# On VPS, pull latest changes
git pull origin main
cd client && npm install && npm run build && cd ..
npm install
pm2 restart all
```

---

## 👥 ROLE COMPARISON

### SUPER ADMIN
- **Login:** `/login` with super_admin account
- **Features:**
  - Platform-wide analytics dashboard
  - Manage all seller businesses (approve, reject, suspend)
  - Assign and track all deliveries
  - View marketplace, all stores
  - Platform settings
- **Sidebar:** 6 items, all functional
- **Data Access:** All sellers, all orders, all deliveries

### SELLER/ADMIN
- **Login:** `/login` with seller account
- **Features:**
  - Dashboard with sales KPIs
  - POS system for in-store sales
  - Inventory management (add/edit/delete products)
  - Customer management
  - Order fulfillment & delivery tracking
  - Expense tracking & budgeting
  - Sales reports & analytics
  - Supplier management
  - Account settings & billing
- **Sidebar:** 9 items, all functional
- **Data Access:** Only their own store data

### BUYER/CUSTOMER
- **No Login Required (Guest):**
  - Browse marketplace (search, filter by category)
  - View store directory
  - Individual store pages
  - Add to cart
  - Checkout (cash, mobile money, card)
  - Track order by invoice number
- **With Login (Customer Portal):**
  - View all personal orders
  - View order details with live updates
  - Get rider assignment notifications
  - Track delivery status in real-time
- **No Sidebar (Storefront only)**
- **Data Access:** Only own orders

---

## 📊 FEATURE COMPLETENESS

| Feature | Super Admin | Seller | Buyer | Status |
|---------|:----------:|:------:|:-----:|:------:|
| Dashboard | ✅ | ✅ | — | ✅ |
| Business Mgmt | ✅ | — | — | ✅ |
| Inventory | — | ✅ | — | ✅ |
| POS | — | ✅ | — | ✅ |
| Orders | ✅ | ✅ | ✅ | ✅ |
| Delivery | ✅ | ✅ | ✅* | ✅ |
| Customers | — | ✅ | — | ✅ |
| Payments | — | — | ✅ | ✅ |
| Reports | — | ✅ | — | ✅ |
| Tracking | ✅ | ✅ | ✅ | ✅ |
| Cart | — | — | ✅ | ✅ |
| Checkout | — | — | ✅ | ✅ |

*Buyer can track their order delivery status

---

## 🛒 BUYER FEATURES IN DETAIL

### Store Browsing
- ✅ Search products (real-time with debounce)
- ✅ Filter by category
- ✅ Sort by relevance
- ✅ View individual store pages
- ✅ See store badges (verified seller)
- ✅ Product ratings and sold count
- ✅ Responsive grid layout (2→5 columns)

### Shopping Cart
- ✅ Add items to cart (click + button)
- ✅ Cart drawer shows items grouped by store
- ✅ Update quantities (+/- buttons)
- ✅ Remove items
- ✅ Persistent cart (localStorage)
- ✅ Cart badge with item count
- ✅ Empty state message

### Checkout
- ✅ Guest info form (name, email, phone, address)
- ✅ 3 payment methods:
  - Cash on delivery
  - Mobile money (M-Pesa, Tigo Pesa, Airtel Money) via USSD
  - Card payment (via gateway)
- ✅ Order summary with total
- ✅ Order confirmation with invoice numbers
- ✅ Payment status polling (3 min timeout)
- ✅ Resume payment via URL: `/checkout?order=SEL-...`

### Order Tracking (Public)
- ✅ Lookup by invoice number (no login needed)
- ✅ Optional email verification for full details
- ✅ Live SSE updates:
  - Delivery status changes
  - Rider assignment
  - Tracking number
  - Delivery timeline
- ✅ Shows payment status, total, items

### Customer Portal (Logged In)
- ✅ View all personal orders
- ✅ Filter by status
- ✅ Click to view order details
- ✅ Live SSE updates while viewing
- ✅ Shows rider info and delivery timeline
- ✅ Sign out button

---

## 🔐 SECURITY FEATURES

### Implemented
- ✅ JWT authentication (24h tokens)
- ✅ Rate limiting (600 req/15min per IP)
- ✅ Rate limiting on login (10 attempts/15min)
- ✅ CORS enabled
- ✅ Helmet.js security headers
- ✅ MongoDB sanitization
- ✅ HTTPS ready (cert config included)
- ✅ Password hashing (bcrypt)
- ✅ PCI compliance (Selcom gateway)

### Recommended Additions
- ⚠️ CSRF protection (add soon)
- ⚠️ CSP headers (add soon)
- ⚠️ 2FA for admin (add soon)
- ⚠️ Input validation (add soon)

---

## 📱 FRONTEND STACK

- **Framework:** React 18 + TypeScript + Vite
- **Router:** React Router v6
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **State:** Context API + localStorage
- **Real-time:** Server-Sent Events (SSE)
- **API:** Axios + custom hooks
- **PWA:** Workbox (service worker)

### Key Components
- `Layout` - Main authenticated layout with sidebar
- `Store` - Marketplace browsing (guest-friendly)
- `Cart` - Shopping cart management
- `Checkout` - Payment & order creation
- `MyOrders` - Customer order portal
- `OrderDetail` - Single order with live updates
- `TrackOrder` - Public tracking
- `SuperAdminDashboard` - Platform analytics
- `Dashboard` - Seller analytics
- `Inventory` - Product management
- `Orders` - Order fulfillment

---

## 🔧 BACKEND STACK

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (jsonwebtoken)
- **Security:** Helmet, Express-rate-limit, MongoDB-sanitize, hpp
- **Logging:** Winston (custom loggers)
- **Process Manager:** PM2
- **Payment:** Selcom API integration
- **File Upload:** Cloudinary

### Key Routes
- `/api/auth` - User authentication
- `/api/customer-auth` - Buyer authentication
- `/api/products` - Product management
- `/api/public/checkout` - Guest checkout
- `/api/orders` - Order management
- `/api/sales` - Sale records
- `/api/deliveries` - Delivery tracking
- `/api/dashboard` - Analytics

---

## 📋 DEPLOYMENT CHECKLIST

Before going live:
- [ ] Set all environment variables
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] PM2 ecosystem config saved
- [ ] Nginx reverse proxy configured
- [ ] Email notifications tested
- [ ] Payment gateway (Selcom) tested
- [ ] Mobile app (PWA) installable
- [ ] Rate limiting verified
- [ ] Admin password changed
- [ ] Super admin account created
- [ ] Monitoring/alerting set up

---

## 🚨 COMMON ISSUES & FIXES

### Port already in use
```bash
lsof -i :5000
kill -9 <PID>
```

### Database connection failed
```bash
# Check MongoDB is running and URL is correct
mongosh "$DATABASE_URL"
```

### API not accessible from frontend
```bash
# Ensure VITE_API_URL is set correctly in .env
# Rebuild client: cd client && npm run build
```

### PM2 not starting on boot
```bash
pm2 startup
# Run the command it outputs
pm2 save
```

### Nginx 502 Bad Gateway
```bash
# Check backend is running
pm2 logs eshopbackend
# Check nginx config
nginx -t
```

---

## 📊 MONITORING COMMANDS

```bash
# Check all services
pm2 status

# View logs
pm2 logs

# Real-time monitoring
pm2 monit

# Disk usage
df -h

# Memory usage
free -h

# Port usage
lsof -i :5000

# Database size
mongosh "$DATABASE_URL" --eval "db.stats()"
```

---

## 🔄 RELEASE WORKFLOW

### Local Development
```bash
git checkout -b feature/my-feature
# ... make changes ...
npm run type-check  # Check TypeScript
npm run build       # Build client
git add -A
git commit -m "feat: description"
git push origin feature/my-feature
# Create PR, review, merge to main
```

### VPS Deployment
```bash
# On VPS
cd /var/www/posdata
git pull origin main
cd client && npm install && npm run build && cd ..
npm install
pm2 restart all
pm2 logs
```

---

## 📞 SUPPORT

For issues or questions:
1. Check `VPS_DEPLOYMENT_GUIDE.md` for detailed setup
2. Check `FEATURE_SECURITY_AUDIT.md` for security info
3. Review logs: `pm2 logs [app-name]`
4. Check database connectivity
5. Verify environment variables

---

**Last Updated:** 2026-08-17  
**Version:** 1.0  
**Maintainer:** Development Team
