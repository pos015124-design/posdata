# Deployment Guide for Dukani System

## Overview
This guide will help you deploy the Dukani System to **Render** and **Vercel**.

---

## ✅ What Was Fixed

Your project had a **nested directory structure** issue:
- **Before**: `dukani-system/dukani-system/server/` (server was nested)
- **After**: `dukani-system/server/` (server is at root level)

The structure is now flattened and ready for deployment.

---

## 📁 Current Project Structure

```
dukani-system/
├── client/              # React frontend
│   ├── src/
│   ├── package.json
│   └── dist/           # Built files (after npm run build)
├── server/              # Node.js backend
│   ├── server.js
│   ├── package.json
│   ├── routes/
│   ├── models/
│   └── config/
├── package.json         # Root package.json
├── vercel.json          # Vercel configuration
├── render.yaml          # Render configuration
└── .gitignore
```

---

## 🚀 Deploy to Render

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub** (already done ✅)

2. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Click "New +" → "Blueprint"

3. **Connect Repository**
   - Select your GitHub repository
   - Render will automatically detect `render.yaml`

4. **Configure Environment Variables**
   Add these in the Render dashboard:
   ```
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dukani
   JWT_SECRET=your-super-secret-jwt-key-change-this
   NODE_ENV=production
   PORT=10000
   ```

5. **Deploy**
   - Click "Apply"
   - Render will build and deploy automatically

### Option 2: Manual Setup

1. **Create New Web Service**
   - Go to Render Dashboard → New + → Web Service
   - Connect your GitHub repository

2. **Configure Settings**
   - **Build Command**: `npm install && cd server && npm install && cd ../client && npm install && npm run build`
   - **Start Command**: `cd server && node server.js`
   - **Environment**: Node

3. **Add Environment Variables**
   ```
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dukani
   JWT_SECRET=your-super-secret-jwt-key-change-this
   NODE_ENV=production
   PORT=10000
   ```

4. **Deploy**

---

## 🌐 Deploy to Vercel

### Option 1: Using vercel.json (Recommended)

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Production Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "New Project"

2. **Import Repository**
   - Select your GitHub repository
   - Vercel will detect `vercel.json`

3. **Configure Environment Variables**
   Add these in Vercel dashboard:
   ```
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/dukani
   JWT_SECRET=your-super-secret-jwt-key-change-this
   NODE_ENV=production
   ```

4. **Deploy**

---

## 🔧 Important Configuration Files

### `vercel.json`
Configures Vercel to:
- Build server as Node.js function
- Build client as static site
- Route API requests to server
- Serve static files from client

### `render.yaml`
Configures Render to:
- Install all dependencies
- Build the client
- Start the server
- Set up persistent disk (if needed)

---

## 📝 Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dukani` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-here` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (Render auto-sets this) | `10000` or `process.env.PORT` |

---

## 🐛 Troubleshooting

### Render Deployment Fails

**Issue**: "Server not found"
- **Solution**: ✅ Already fixed! Server is now at root level

**Issue**: "Dependencies not found"
- **Solution**: Make sure both `npm install` commands run:
  ```bash
  npm install  # root
  cd server && npm install  # server
  ```

**Issue**: "Build command failed"
- **Solution**: Check the build logs in Render dashboard

### Vercel Deployment Fails

**Issue**: "Module not found"
- **Solution**: Verify `vercel.json` has correct paths

**Issue**: "API routes not working"
- **Solution**: Check that routes start with `/api/`

### General Issues

**Issue**: "MongoDB connection failed"
- **Solution**: 
  1. Verify `DATABASE_URL` is correct
  2. Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for testing)
  3. Ensure database user has correct permissions

**Issue**: "CORS errors"
- **Solution**: Update CORS configuration in `server/server.js` to include your frontend URL

---

## 🧪 Testing Before Deployment

1. **Install all dependencies**
   ```bash
   npm run install:all
   ```

2. **Test locally**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Test production build**
   ```bash
   npm start
   ```

---

## 📊 Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Database connection is successful
- [ ] API endpoints are accessible
- [ ] Frontend loads correctly
- [ ] Authentication works (login/register)
- [ ] Create admin user: `npm run create-admin`

---

## 🔐 Security Notes

1. **Never commit `.env` files** to Git
2. **Change JWT_SECRET** to a strong, random string
3. **Use MongoDB Atlas** with IP whitelisting
4. **Enable HTTPS** (automatic on Render/Vercel)
5. **Keep dependencies updated**

---

## 📞 Need Help?

- Check deployment logs in dashboard
- Review `server/server.js` for startup configuration
- Verify all environment variables are set
- Test locally before deploying

---

## 🎉 Success!

Your Dukani System should now be deployed and running! 

**Next Steps**:
1. Access your deployed URL
2. Create an admin account
3. Configure your business settings
4. Start adding products and managing inventory
