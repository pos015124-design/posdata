# Play Store Deployment Checklist
## E-Shop by BHABY GROUP LTD

This document contains every manual step required to publish the app to Google Play.
All code changes have already been implemented. Follow these steps in order.

---

## Prerequisites — Install on your machine once

```
Node.js >= 18          already installed (you have this)
Java JDK >= 11         required for keytool and Android build
Android Studio         required for Bubblewrap build
Bubblewrap CLI         install after Java: npm install -g @bubblewrap/cli
```

### Install Java JDK (if not installed)
1. Go to https://adoptium.net
2. Download **Temurin JDK 17** (LTS) for Windows
3. Run the installer — tick "Set JAVA_HOME variable"
4. Open a new terminal and verify: `java -version`

### Install Bubblewrap
```
npm install -g @bubblewrap/cli
```

---

## Phase 1 — Generate Maskable Icons

The app needs separate maskable PNG icons for Android adaptive icons.
The generator script is already written at `client/scripts/gen-maskable-icons.cjs`.

**Step 1.1 — Install sharp (one-time)**
```
cd c:\Users\PC\Documents\dukani-system\client
npm install --save-dev sharp
```

**Step 1.2 — Run the generator**
```
node scripts/gen-maskable-icons.cjs
```

Expected output:
```
Generating maskable icons...
  ✓ Generated ...client/public/icon-192-maskable.png
  ✓ Generated ...client/public/icon-512-maskable.png
Done. Files written to client/public/
```

**Step 1.3 — Verify the maskable icons**
1. Go to https://maskable.app/editor
2. Upload `client/public/icon-512-maskable.png`
3. Toggle through all mask shapes (circle, squircle, teardrop, etc.)
4. Confirm the "E" logo is fully visible in all shapes
5. If it gets clipped, the icon content is too large — edit `gen-maskable-icons.cjs`
   and reduce `0.60` to `0.55` then re-run

---

## Phase 2 — Take Screenshots

The manifest references 3 screenshots. You need to capture them from the live app.

**Required screenshots:**

| File | Size | Content |
|---|---|---|
| `client/public/screenshots/mobile-store.png` | 390×844 px | Marketplace page (`/store`) on mobile |
| `client/public/screenshots/mobile-dashboard.png` | 390×844 px | Seller dashboard (`/dashboard`) on mobile |
| `client/public/screenshots/desktop-store.png` | 1280×800 px | Marketplace page on desktop |

**How to capture:**

Mobile screenshots (390×844):
1. Open Chrome on desktop
2. Press F12 to open DevTools
3. Click the device toolbar icon (Ctrl+Shift+M)
4. Set dimensions to 390×844
5. Navigate to https://e-shop.bhabygroup.co.tz/store
6. Right-click → "Capture screenshot" (or use the 3-dot menu in DevTools)
7. Save as `mobile-store.png`
8. Repeat for `/dashboard` → save as `mobile-dashboard.png`

Desktop screenshot (1280×800):
1. Set browser window to 1280×800
2. Navigate to https://e-shop.bhabygroup.co.tz/store
3. Press F12 → Ctrl+Shift+P → type "screenshot" → "Capture full size screenshot"
4. Save as `desktop-store.png`

Place all 3 files in `client/public/screenshots/`.

---

## Phase 3 — Build and Deploy the Updated PWA

After completing Phases 1 and 2:

**Step 3.1 — Build the client**
```
cd c:\Users\PC\Documents\dukani-system\client
npm run build
```

**Step 3.2 — Verify the manifest was generated**
Check that `client/dist/manifest.webmanifest` exists and contains:
- `"scope": "/"`
- `"id": "/"`
- All 5 icons listed (including the two maskable ones)
- 3 screenshots listed

**Step 3.3 — Deploy to Vercel**
```
cd c:\Users\PC\Documents\dukani-system
git add -A
git commit -m "feat: PWA hardening for Play Store — maskable icons, screenshots, manifest fixes"
git push
```
Vercel auto-deploys on push. Wait ~2 minutes then verify at https://e-shop.bhabygroup.co.tz

**Step 3.4 — Run Lighthouse audit**
1. Open Chrome → go to https://e-shop.bhabygroup.co.tz
2. Press F12 → Lighthouse tab
3. Select: Mobile, PWA + Performance + Accessibility
4. Click "Analyze page load"

Target scores:
- PWA: all checks green ✅
- Performance: ≥ 70
- Accessibility: ≥ 80

Fix any PWA failures before proceeding to Phase 4.

---

## Phase 4 — Create the Android Keystore

The keystore is your permanent signing identity. **Never lose this file.**
If you lose it, you can never update the app on Play Store.

**Step 4.1 — Create the keystore**

Open Command Prompt (not PowerShell) and run:
```
keytool -genkey -v -keystore eshop-release.keystore -alias eshop -keyalg RSA -keysize 2048 -validity 10000
```

You will be asked:
- Keystore password: choose a strong password, write it down
- First and last name: BHABY GROUP LTD
- Organizational unit: E-Shop
- Organization: BHABY GROUP LTD
- City: Zanzibar (or your city)
- State: Zanzibar
- Country code: TZ

**Step 4.2 — Get the SHA-256 fingerprint**
```
keytool -list -v -keystore eshop-release.keystore -alias eshop
```

Look for the line:
```
SHA256: AB:CD:EF:01:23:45:...
```

Copy the full fingerprint (32 colon-separated hex pairs).

**Step 4.3 — Set the fingerprint in your Render environment**

Go to your Render dashboard → E-Shop API service → Environment:
- Add variable: `TWA_SHA256_FINGERPRINT`
- Value: the SHA-256 fingerprint you copied (with colons)

This makes the `/.well-known/assetlinks.json` endpoint return the correct fingerprint.

**Step 4.4 — Verify assetlinks.json is live**

After Render redeploys, open in browser:
```
https://posdata-73sd.onrender.com/.well-known/assetlinks.json
```

Confirm it returns JSON with your SHA-256 fingerprint (not the placeholder).

Also verify via Google's tool:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://e-shop.bhabygroup.co.tz&relation=delegate_permission/common.handle_all_urls
```

---

## Phase 5 — Build the TWA Android App

**Step 5.1 — Create a project folder**
```
mkdir c:\eshop-twa
cd c:\eshop-twa
```

**Step 5.2 — Initialize Bubblewrap**
```
bubblewrap init --manifest https://e-shop.bhabygroup.co.tz/manifest.webmanifest
```

Answer the prompts exactly as follows:

| Prompt | Answer |
|---|---|
| Application package name | `co.tz.bhabygroup.eshop` |
| Application name | `E-Shop` |
| Application short name | `E-Shop` |
| Application version | `1` |
| Application version name | `1.0.0` |
| Start URL | `https://e-shop.bhabygroup.co.tz/` |
| Display mode | `standalone` |
| Status bar color | `#2563eb` |
| Splash screen color | `#ffffff` |
| Splash screen fade out duration | `300` |
| Key store location | path to `eshop-release.keystore` |
| Key store password | your keystore password |
| Key alias | `eshop` |
| Key password | your key password |

**Step 5.3 — Build the Android App Bundle**
```
bubblewrap build
```

This produces:
- `app-release-bundle.aab` — upload this to Play Store
- `app-release-signed.apk` — use this to test on a real device

**Step 5.4 — Test on a real Android device**
1. Enable "Install from unknown sources" on your Android phone
2. Transfer `app-release-signed.apk` to the phone
3. Install it
4. Open the app — verify:
   - Splash screen shows with blue gradient
   - No browser address bar visible
   - App opens to the marketplace
   - Login works
   - Checkout works
   - Seller dashboard works
   - Back button navigates correctly (does not exit the app unexpectedly)

---

## Phase 6 — Google Play Store Submission

**Step 6.1 — Create a Google Play Developer account**
1. Go to https://play.google.com/console
2. Sign in with a Google account (use a BHABY GROUP LTD business account)
3. Pay the one-time $25 USD registration fee
4. Complete the account details form

**Step 6.2 — Create a new app**
1. Click "Create app"
2. App name: `E-Shop — BHABY GROUP LTD`
3. Default language: English
4. App or game: App
5. Free or paid: Free
6. Accept the declarations

**Step 6.3 — Prepare store listing assets**

Gather these before filling in the form:

| Asset | Spec | Notes |
|---|---|---|
| App icon | 512×512 PNG, no alpha | Use `icon-512.png` |
| Feature graphic | 1024×500 PNG | Create a banner image with the E-Shop logo and tagline |
| Phone screenshots | Min 2, max 8 (16:9 or 9:16) | Use the screenshots from Phase 2 |
| Short description | Max 80 characters | "Multi-vendor marketplace by BHABY GROUP LTD — buy and sell locally" |
| Full description | Max 4000 characters | See template below |

**Full description template:**
```
E-Shop by BHABY GROUP LTD is Tanzania's multi-vendor marketplace connecting 
local sellers with buyers across the country.

FOR BUYERS:
• Browse products from hundreds of local sellers
• Add to cart and checkout in seconds — no account needed
• Cash on delivery, mobile money, or card payment
• BHABY GROUP LTD handles delivery to your door

FOR SELLERS:
• Open your own online store in minutes
• Manage inventory, process POS sales, track expenses
• Receive fulfillment requests — we handle delivery
• View reports and analytics for your business

BHABY GROUP LTD is the trusted middleman — we verify every seller, 
manage delivery, and ensure a safe shopping experience for all buyers.

Download E-Shop and start shopping or selling today.
```

**Step 6.4 — Fill in the content rating questionnaire**
- Category: Shopping
- Content rating: Everyone
- No violence, no adult content, no user-generated content that isn't moderated

**Step 6.5 — Fill in the data safety form**

Declare the following:

| Data type | Collected | Shared | Purpose |
|---|---|---|---|
| Email address | Yes | No | Account registration |
| Name | Yes | No | Order fulfillment |
| Phone number | Yes | No | Order fulfillment, delivery contact |
| Address | Yes | No | Delivery |
| Purchase history | Yes | No | Order management |

Data is encrypted in transit (HTTPS). Users can request deletion by contacting info@bhabygroup.co.tz.

**Step 6.6 — Upload the AAB**
1. Go to Production → Releases → Create new release
2. Upload `app-release-bundle.aab`
3. Add release notes: "Initial release of E-Shop by BHABY GROUP LTD"
4. Click "Review release"

**Step 6.7 — Submit for review**
1. Fix any warnings shown in the review screen
2. Click "Start rollout to Production"
3. Google review takes 3–7 business days for first submission

---

## Phase 7 — After Approval

Once Google approves the app:

**Step 7.1 — Verify TWA verification is working**
Install the app from Play Store on an Android device.
The address bar must NOT appear. If it does, the assetlinks.json verification failed.
Check: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://e-shop.bhabygroup.co.tz&relation=delegate_permission/common.handle_all_urls

**Step 7.2 — Future updates**
- Content/feature updates: just push to git → Vercel deploys → app updates automatically (no Play Store review needed)
- App shell changes (manifest, icons, package name): rebuild with Bubblewrap, upload new AAB to Play Store

---

## Quick Reference — Key Values

| Item | Value |
|---|---|
| Package name | `co.tz.bhabygroup.eshop` |
| App domain | `https://e-shop.bhabygroup.co.tz` |
| API domain | `https://posdata-73sd.onrender.com` |
| assetlinks.json URL | `https://posdata-73sd.onrender.com/.well-known/assetlinks.json` |
| Keystore file | `eshop-release.keystore` (keep safe, never commit to git) |
| Key alias | `eshop` |
| Render env var | `TWA_SHA256_FINGERPRINT` |

---

*Last updated: May 2026 — BHABY GROUP LTD*
