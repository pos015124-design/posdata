# E-commerce Integration & System Improvements

## Phase 1: Critical Bug Fixes & UI Improvements

### 1.1 Fix Mobile Page Title Alignment
**Problem:** Page titles are left-aligned and covered by hamburger menu on mobile.

**Solution:**
- Update `client/src/components/Layout.tsx` header section
- Change title alignment to centered on mobile, left-aligned on desktop
- Add left padding on mobile to prevent overlap with menu button
- Files: `client/src/components/Layout.tsx` (header div around line 140-160)

**Implementation:**
```tsx
// Current: <h1 className="text-xl font-semibold">...</h1>
// New: <h1 className="text-lg md:text-xl font-semibold text-center md:text-left pl-12 md:pl-0">...</h1>
```

### 1.2 Fix Seller Update Creating Duplicate
**Problem:** When updating seller status (e.g., pending to active), it creates a new seller instead of updating.

**Root Cause:** `client/src/pages/Sellers.tsx` handleEditSeller reuses the add modal and doesn't distinguish between create vs update operations properly. The backend `sellerRoutes.js` PUT endpoint expects userId but frontend doesn't provide it.

**Solution:**
- Update `client/src/pages/Sellers.tsx`:
  - Separate `editingSeller` state to track if we're editing vs creating
  - Fix `handleUpdateSeller` to use PUT request with correct seller ID
  - Prevent form submission from calling handleAddSeller when editing
- Update `server/routes/sellerRoutes.js`:
  - Add authentication middleware
  - Ensure PUT endpoint properly updates status without creating new records

**Files:** 
- `client/src/pages/Sellers.tsx` (lines 72-140, 250-300)
- `server/routes/sellerRoutes.js` (lines 39-47)

### 1.3 Remove Supplier Field from Inventory Form
**Problem:** Supplier name is required in product form but not needed for the current workflow.

**Solution:**
- Update `client/src/pages/Inventory.tsx`:
  - Remove supplier field from formData state
  - Remove supplier input from add/edit modal
  - Make supplier optional or auto-set to default value in backend
- Update `server/models/Product.js`:
  - Change supplier from required to optional (line 147-151)

**Files:**
- `client/src/pages/Inventory.tsx` (lines 20-30, form modal section)
- `server/models/Product.js` (line 149: remove `required: true`)

### 1.4 Allow Case-Insensitive Categories
**Problem:** Categories must match exact case.

**Solution:**
- Update category validation in product creation/update to lowercase before saving
- Update product filtering/search to use case-insensitive comparison
- Add category normalization middleware in backend

**Files:**
- `client/src/pages/Inventory.tsx` (handleInputChange function)
- `server/routes/productRoutes.js` (POST and PUT endpoints)
- Add pre-save hook in `server/models/Product.js`:
```javascript
productSchema.pre('save', function(next) {
  if (this.category) {
    this.category = this.category.trim();
  }
  next();
});
```

## Phase 2: Product Image Upload & Display

### 2.1 Add Image Upload to Inventory Form
**Problem:** No way to add product images when creating/editing products.

**Solution:**
- Install `multer` for file upload handling in backend
- Create `server/config/upload.js` for multer configuration
- Add image upload endpoint in `server/routes/uploadRoutes.js`
- Update `client/src/pages/Inventory.tsx`:
  - Add file input to product form
  - Implement image preview before upload
  - Handle file upload to server on form submit
  - Store image URLs in product.images array

**New Files:**
- `server/config/upload.js` - Multer config for image uploads
- `server/routes/uploadRoutes.js` - Image upload endpoint
- `client/src/api/uploads.ts` - Frontend upload API helper

**Modified Files:**
- `server/server.js` - Register upload routes
- `client/src/pages/Inventory.tsx` - Add image upload UI
- `client/src/api/products.ts` - Add image field to product creation

### 2.2 Display Product Images in Inventory & POS
**Problem:** Products display without images.

**Solution:**
- Update `client/src/pages/Inventory.tsx` product table to show thumbnail images
- Update `client/src/pages/POS.tsx` product grid cards to display images prominently
- Add placeholder image for products without images
- Optimize image loading with lazy loading

**Files:**
- `client/src/pages/Inventory.tsx` (product table rows)
- `client/src/pages/POS.tsx` (product card components)

## Phase 3: Bulk Product Import

### 3.1 CSV/Excel Import for Products
**Problem:** Users with 200+ products can't manually input them one by one.

**Solution:**
- Install `csv-parser` and `xlsx` packages in backend
- Create bulk import endpoint `POST /api/products/import`
- Create import template generator `GET /api/products/import-template`
- Add import UI in Inventory page:
  - Download template button
  - File upload area for CSV/Excel
  - Preview imported products before confirming
  - Error handling for invalid rows
  - Progress indicator for large imports

**New Files:**
- `server/routes/importRoutes.js` - Bulk import endpoints
- `server/services/importService.js` - CSV/Excel parsing logic

**Modified Files:**
- `client/src/pages/Inventory.tsx` - Add import modal/UI
- `client/src/api/products.ts` - Add import API functions
- `server/server.js` - Register import routes

**CSV Template Structure:**
```csv
name,code,barcode,price,purchasePrice,stock,category,description
Product Name,PRD001,123456789,5000,3000,100,Electronics,Description here
```

## Phase 4: Shared Catalog Architecture

### 4.1 Implement Global Product Catalog
**Problem:** Need shared product catalog where sellers can add products but customize their own price and stock.

**Current State:** Already has `Product.js` (global catalog) and `SellerInventory.js` (seller-specific pricing/stock) models!

**Solution - Leverage Existing Architecture:**
- Update Product model to be admin-managed global catalog
- Update SellerInventory model to link sellers to products with custom pricing
- Implement proper access control:
  - Admin: Can create/edit global products (name, description, images, category)
  - Sellers: Can only set their own price, stock, and SKU for catalog products
  - Sellers cannot see other sellers' prices or stock

**Backend Changes:**
- Update `server/routes/productRoutes.js`:
  - Admin endpoints for catalog management (CRUD for Product)
  - Seller endpoints for inventory management (CRUD for SellerInventory)
  - Add role-based access control middleware
- Create `server/routes/sellerInventoryRoutes.js`:
  - `GET /api/seller-inventory` - Get seller's own inventory only
  - `POST /api/seller-inventory` - Add product to seller's inventory
  - `PUT /api/seller-inventory/:id` - Update seller's price/stock
  - `DELETE /api/seller-inventory/:id` - Remove from seller's inventory

**Frontend Changes:**
- Update `client/src/pages/Inventory.tsx`:
  - For Admin: Show full product catalog management
  - For Sellers: Show only their inventory with price/stock editing
  - Add "Add from Catalog" button for sellers
- Update `client/src/api/products.ts`:
  - Add seller inventory API functions
  - Add role-based API routing

**Files:**
- `server/routes/sellerInventoryRoutes.js` (new)
- `server/routes/productRoutes.js` (update with RBAC)
- `client/src/pages/Inventory.tsx` (role-based UI)
- `client/src/api/products.ts` (add seller inventory endpoints)
- `server/middleware/validation.js` (add role checking)

### 4.2 Update POS to Use Seller Inventory
**Problem:** POS currently uses global product price, not seller-specific pricing.

**Solution:**
- Update POS to fetch seller's inventory items with their pricing
- Filter products by selected seller and show their custom prices
- Update checkout to use SellerInventory prices

**Files:**
- `client/src/pages/POS.tsx` (fetch from seller inventory endpoint)
- `client/src/api/products.ts` (add getSellerInventory function)

## Phase 5: E-commerce Storefront

### 5.1 Create Customer-Facing Storefront
**Problem:** Need full e-commerce site for customers to browse and purchase.

**Solution:**
- Create new pages under `client/src/pages/shop/`:
  - `ShopHome.tsx` - Landing page with featured products
  - `ShopProducts.tsx` - Product catalog with filters/search
  - `ShopProductDetail.tsx` - Individual product page with images, variants, add to cart
  - `ShopCart.tsx` - Shopping cart page
  - `ShopCheckout.tsx` - Checkout with customer info, shipping, payment
  - `ShopOrderConfirmation.tsx` - Order success page
  - `CustomerLogin.tsx` - Customer authentication
  - `CustomerDashboard.tsx` - Order history, profile management

**New Components:**
- `client/src/components/shop/` - Shop-specific components
  - `ProductCard.tsx` - Product display card
  - `ProductGallery.tsx` - Image gallery with zoom
  - `CartSummary.tsx` - Cart totals and checkout button
  - `CustomerReviews.tsx` - Product reviews section

**New API Routes:**
- `server/routes/shopRoutes.js`:
  - `GET /api/shop/products` - Get published products
  - `GET /api/shop/products/:id` - Product detail
  - `POST /api/shop/cart` - Create cart
  - `POST /api/shop/checkout` - Process checkout

**New Models:**
- `server/models/Customer.js` - Customer accounts
- `server/models/CustomerOrder.js` - Customer orders with multi-seller support
- `server/models/Review.js` - Product reviews

**Files:**
- 7 new page files in `client/src/pages/shop/`
- 4 new component files in `client/src/components/shop/`
- 3 new model files in `server/models/`
- `server/routes/shopRoutes.js` (new)
- `client/src/api/shop.ts` (new)
- `client/src/contexts/ShopCartContext.tsx` (new - cart state management)

### 5.2 Shopping Cart System
**Problem:** Need persistent cart across sessions.

**Solution:**
- Create `ShopCartContext` for global cart state
- Store cart in localStorage for guests
- Merge cart with account on login
- Cart structure:
```typescript
interface CartItem {
  productId: string;
  sellerId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}
```

**Files:**
- `client/src/contexts/ShopCartContext.tsx`
- `client/src/api/shop.ts` (cart operations)

### 5.3 Checkout & Payment Integration
**Problem:** Current POS checkout is not fully functional with real API.

**Solution:**

**POS Checkout (Update Existing):**
- Update `client/src/pages/POS.tsx` handleCheckout to:
  - Validate stock availability before checkout
  - Create Sale record with seller info
  - Update SellerInventory stock after sale
  - Generate receipt/invoice number
  - Support multiple payment methods (cash, mobile money, card)

**E-commerce Checkout (New):**
- Create checkout flow:
  1. Customer info (name, email, phone, address)
  2. Shipping method selection
  3. Payment method selection (M-Pesa, Tigo Pesa, Airtel Money, card)
  4. Order review
  5. Payment processing
  6. Order confirmation

**Payment Integration:**
- Integrate with Tanzania mobile money APIs:
  - M-Pesa (Vodacom)
  - Tigo Pesa
  - Airtel Money
- Create `server/services/paymentService.js` for payment processing
- Create webhook endpoints for payment confirmations

**Files:**
- `client/src/pages/POS.tsx` (update checkout function)
- `client/src/pages/shop/ShopCheckout.tsx` (new)
- `server/routes/shopRoutes.js` (checkout endpoint)
- `server/services/paymentService.js` (new)
- `server/models/CustomerOrder.js` (new)
- `server/routes/paymentWebhook.js` (new)

## Phase 6: Integration & Sync

### 6.1 POS-Ecommerce Data Sync
**Problem:** Need real-time sync between POS sales and e-commerce inventory.

**Solution:**
- When POS sale completes:
  - Decrease SellerInventory stock
  - If stock reaches 0, mark as "Out of Stock" in shop
- When e-commerce order completes:
  - Decrease SellerInventory stock
  - Update POS inventory in real-time
- Use MongoDB transactions for atomic updates
- Add webhook/events system for notifications

**Files:**
- `server/services/inventorySyncService.js` (new)
- Update sale creation in `server/routes/salesRoutes.js`
- Update order creation in `server/routes/shopRoutes.js`

### 6.2 Order Management System
**Problem:** Need unified order management for both POS and e-commerce.

**Solution:**
- Create `client/src/pages/Orders.tsx` enhancement:
  - Show both POS sales and e-commerce orders
  - Filter by source (POS/Online)
  - Order status tracking
  - Multi-seller order splitting
  - Fulfillment workflow

**Files:**
- `client/src/pages/Orders.tsx` (major update)
- `server/routes/orderRoutes.js` (new or update existing)

## Phase 7: Testing & Polish

### 7.1 Mobile Responsiveness Audit
- Test all new pages on mobile devices
- Fix any overflow or layout issues
- Ensure touch targets are adequate size
- Optimize image loading on mobile

### 7.2 Performance Optimization
- Implement pagination for product lists (200+ products)
- Add infinite scroll or "Load More" button
- Lazy load product images
- Add search debounce to prevent excessive API calls
- Implement caching for product catalog

### 7.3 Error Handling & Validation
- Add form validation for all new forms
- Implement proper error messages
- Add loading states for all async operations
- Handle network failures gracefully

## Implementation Order & Priority

**Week 1:** Phase 1 (Critical fixes) + Phase 2 (Image upload)
**Week 2:** Phase 3 (Bulk import) + Phase 4 (Shared catalog)
**Week 3:** Phase 5 (E-commerce storefront)
**Week 4:** Phase 6 (Integration & sync) + Phase 7 (Testing)

## Key Technical Decisions

1. **Image Storage:** Store images locally in `server/uploads/` for now, can migrate to cloud storage (AWS S3, Cloudinary) later
2. **Cart Persistence:** localStorage for guests, database for logged-in customers
3. **Payment:** Start with manual payment confirmation, integrate real payment APIs in Phase 2
4. **Catalog Architecture:** Use existing Product + SellerInventory models (already designed for this!)
5. **Authentication:** Extend current JWT system for customer accounts
6. **Mobile-First:** All new pages built with responsive design from start

## Files Summary

**New Files (approx 25):**
- Backend: 6 route files, 3 model files, 4 service files, 2 config files
- Frontend: 7 page files, 4 component files, 2 API files, 1 context file

**Modified Files (approx 15):**
- Backend: 4 existing route/model files
- Frontend: 6 existing page/component files, 2 config files

**Total Effort:** Approximately 80-100 hours of development work
