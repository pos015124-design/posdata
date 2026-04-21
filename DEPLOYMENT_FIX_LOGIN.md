# 🔧 Login Issue Fix - Deployment Guide

## Problem
Login failing after deployment to Vercel and Render because:
1. Backend environment variables not configured in Render
2. Frontend doesn't know backend URL when deployed separately

## ✅ Solution: Choose ONE Deployment Strategy

---

## Option 1: Vercel ALL-IN-ONE (Recommended & Easiest) ✨

**Everything in one deployment - Frontend + Backend together**

### Steps:

1. **Add Environment Variables in Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Add these variables:
     ```
     DATABASE_URL=mongodb+srv://posdata:14dkD6JuiSLLNz4R@cluster1.6ywjfa8.mongodb.net/dukani_system?retryWrites=true&w=majority
     JWT_SECRET=dukani_super_secure_jwt_secret_key_for_local_development_testing_2024
     REFRESH_TOKEN_SECRET=dukani_super_secure_refresh_token_secret_key_for_local_development_testing_2024
     NODE_ENV=production
     ```

2. **Redeploy in Vercel:**
   - Go to **Deployments** tab
   - Click **...** on latest deployment → **Redeploy**
   - Or push a new commit to trigger auto-deployment

3. **Test Login:**
   - Visit your Vercel URL
   - Login with your admin credentials

**✅ Done!** Frontend and backend are on the same domain, so API calls use relative URLs.

---

## Option 2: Separate Deployments (Vercel Frontend + Render Backend)

**Frontend on Vercel, Backend on Render**

### Step 1: Configure Render Backend

1. **Add Environment Variables in Render Dashboard:**
   - Go to: https://dashboard.render.com
   - Select your web service
   - Go to **Environment** tab
   - Add these variables:
     ```
     DATABASE_URL=mongodb+srv://posdata:14dkD6JuiSLLNz4R@cluster1.6ywjfa8.mongodb.net/dukani_system?retryWrites=true&w=majority
     JWT_SECRET=dukani_super_secure_jwt_secret_key_for_local_development_testing_2024
     REFRESH_TOKEN_SECRET=dukani_super_secure_refresh_token_secret_key_for_local_development_testing_2024
     NODE_ENV=production
     PORT=3001
     ```

2. **Get Your Render Backend URL:**
   - It will be something like: `https://your-app-name.onrender.com`
   - Copy this URL

3. **Redeploy Render:**
   - Click **Manual Deploy** → **Deploy latest commit**

### Step 2: Configure Vercel Frontend

1. **Create `.env.local` file in `client/` directory:**
   ```bash
   cd client
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and add your Render URL:**
   ```env
   VITE_API_URL=https://your-app-name.onrender.com
   ```

3. **Add Environment Variable in Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Add:
     ```
     VITE_API_URL=https://your-app-name.onrender.com
     ```

4. **Redeploy Vercel:**
   - Push a new commit OR
   - Go to **Deployments** → **...** → **Redeploy**

### Step 3: Test Login
- Visit your Vercel frontend URL
- Login should now work!

---

## 🔍 How to Verify Your Setup

### Check Backend is Running:
```
# For Vercel all-in-one:
https://your-app.vercel.app/health

# For Render:
https://your-app.onrender.com/health
```

Should return: `{"status":"OK","timestamp":"..."}`

### Check Database Connection:
1. Login to MongoDB Atlas: https://cloud.mongodb.com
2. Go to **Database Access**
3. Verify user `posdata` exists and has read/write permissions
4. Go to **Network Access**
5. Ensure `0.0.0.0/0` (all IPs) is allowed (for development)

### Check User Exists in Database:
Run this in MongoDB Atlas → Collections:
```javascript
// In dukani_system database → users collection
db.users.find({}).toArray()
```

You should see your admin user there.

---

## 🐛 Common Issues & Solutions

### Issue 1: "Invalid credentials" error
**Solution:**
- User might not be approved yet
- Run in MongoDB:
  ```javascript
  db.users.updateOne(
    { email: "your-email@example.com" },
    { $set: { isApproved: true } }
  )
  ```

### Issue 2: Network Error / CORS Error
**Solution:**
- For Vercel all-in-one: Make sure `vercel.json` routes are correct
- For separate deployments: Make sure `VITE_API_URL` is set correctly
- Check browser console for exact error

### Issue 3: Database connection failed on Render
**Solution:**
- Verify `DATABASE_URL` is set in Render environment variables
- Check MongoDB Atlas Network Access allows Render's IP
- Check Render logs: Dashboard → Your Service → Logs

### Issue 4: Frontend can't reach backend
**Solution:**
- Open browser DevTools → Network tab
- Try to login and check the failed request
- Verify the request URL is correct:
  - Vercel all-in-one: Should be `/api/auth/login`
  - Separate: Should be `https://your-render-url/api/auth/login`

---

## 🎯 Quick Fix Right Now

If you're using **Vercel all-in-one** (which your `vercel.json` suggests):

1. Go to Vercel Dashboard
2. Add environment variables (DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET)
3. Redeploy
4. Login should work!

If login still fails, your user might need approval in MongoDB:
```javascript
db.users.updateMany({}, { $set: { isApproved: true } })
```

---

## 📝 Admin Credentials

You mentioned you added a user in MongoDB Atlas. To verify:

1. Go to MongoDB Atlas → Collections
2. Find your user in `dukani_system.users`
3. Make sure:
   - `isApproved: true`
   - Password is hashed (starts with `$2a$` or `$2b$`)
   - Email is correct

If you need to create an admin user, you can use the `createAdmin.js` script:
```bash
cd server
node createAdmin.js
```

---

## 🚀 After Fixing

Once login works, commit and push:
```bash
git add .
git commit -m "fix: Update API configuration for production deployment"
git push
```

This will trigger auto-deployment to Vercel/Render with the fixes.
