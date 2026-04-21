# 🚨 CRITICAL: Fix Render Deployment Settings

## The Error You're Seeing:
```
Root directory 'dukani-system/server' does not exist, please check settings
```

## 🔧 How to Fix It (2 Minutes)

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com
2. Click on your **dukani-system** service

### Step 2: Fix Root Directory Setting
1. Click **"Settings"** tab
2. Scroll down to **"Root Directory"** field
3. **DELETE** whatever is in there (probably says `dukani-system/server`)
4. **Leave it BLANK (empty)**
5. Click **"Save Changes"**

### Step 3: Redeploy
1. Go to **"Manual Deploy"** section
2. Click **"Deploy latest commit"**
3. Wait for deployment to complete ✅

---

## 📋 Correct Render Settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `(leave blank)` ← THIS IS THE KEY! |
| **Build Command** | `npm install && cd server && npm install && cd ../client && npm install && npm run build` |
| **Start Command** | `cd server && node server.js` |
| **Environment** | `Node` |

---

## 🤔 Why This Happened

Your Git repository structure is:
```
Repository Root (github.com/yourusername/dukani-system)
├── server/          ← Server is HERE
├── client/          ← Client is HERE
├── package.json
└── render.yaml
```

When you set Root Directory to `dukani-system/server`, Render was looking for:
```
Repository Root → dukani-system → server → (doesn't exist!)
```

By leaving it blank, Render uses the repository root, where `server/` actually exists.

---

## ✅ Verification

After redeploying, you should see in the logs:
```
✅ Database connected successfully
🚀 Server running at http://localhost:<port>
✅ Server started successfully!
```

---

## 🆘 Still Not Working?

### Option 1: Delete and Recreate Service
1. Delete the current service in Render
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. **IMPORTANT**: Leave Root Directory blank
5. Set environment variables
6. Deploy

### Option 2: Use Render Blueprint
1. Delete current service
2. Click **New +** → **Blueprint**
3. Connect your repo
4. Render will auto-detect `render.yaml`
5. Deploy

---

## 📝 Environment Variables to Set

Don't forget to add these in Render dashboard → Environment:

```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dukani
JWT_SECRET=your-super-secret-key-here
NODE_ENV=production
```

---

## 🎯 Quick Checklist

- [ ] Root Directory is BLANK (not `dukani-system/server`)
- [ ] Build Command is correct
- [ ] Start Command is correct  
- [ ] Environment variables are set
- [ ] Deployed latest commit

Once Root Directory is blank, it will work! 🚀
