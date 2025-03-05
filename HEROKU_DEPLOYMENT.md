# Heroku Deployment Guide for Dukani System

This guide explains how to deploy the Dukani System to Heroku.

## Prerequisites

1. A Heroku account
2. Heroku CLI installed on your computer
3. Git installed on your computer
4. MongoDB Atlas account (or another MongoDB provider)

## Setup Environment Variables

You need to set up the following environment variables in Heroku:

1. `DATABASE_URL`: Your MongoDB connection string
2. `JWT_SECRET`: A secret key for JWT token generation
3. `NODE_ENV`: Set to "production"

## Deployment Steps

### 1. Login to Heroku

```bash
heroku login
```

### 2. Create a Heroku App

```bash
heroku create your-app-name
```

### 3. Set Environment Variables

```bash
heroku config:set DATABASE_URL=your_mongodb_connection_string
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set NODE_ENV=production
```

### 4. Deploy to Heroku

```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

### 5. Open the App

```bash
heroku open
```

## Troubleshooting

If you encounter any issues, check the logs:

```bash
heroku logs --tail
```

Common issues:

- Missing environment variables
- Database connection problems
- Build failures

## Manual Deployment

If you prefer to deploy manually:

1. Ensure you have the latest code committed
2. Run:

```bash
git push heroku main
```

## Monitoring

You can monitor your application using the Heroku dashboard or with:

```bash
heroku logs --tail
```
