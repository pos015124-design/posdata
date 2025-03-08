# Deploying Dukani System to Heroku

This guide provides step-by-step instructions for deploying the Dukani System application to Heroku.

## Prerequisites

1. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
2. Git repository initialized and all changes committed
3. MongoDB Atlas account (or other MongoDB provider) for the database

## Deployment Steps

### 1. Create a Heroku App

```bash
heroku create dukani-system
```

### 2. Set Environment Variables

Set the required environment variables in Heroku:

```bash
heroku config:set DATABASE_URL=mongodb+srv://dukani:1bKAx0SismDokGpL@cluster0.abild.mongodb.net/dukaniDB?retryWrites=true&w=majority&appName=Cluster0
heroku config:set JWT_SECRET=exrev-secret
heroku config:set NODE_ENV=production
```

### 3. Set Up Git Repository for Heroku

If you've already created a Heroku app and tried to clone it inside your existing project directory, you might have encountered Git repository conflicts. Here's how to properly set up your Git repository for Heroku deployment:

1. First, make sure you're in the root directory of your project:

```bash
cd /path/to/dukani-system
```

2. If you've already tried to clone the Heroku repository inside your project, remove it:

```bash
rm -rf dukani-system
```

3. Initialize a Git repository (if not already initialized):

```bash
git init
```

4. Add all files to the repository:

```bash
git add .
```

5. Commit the changes:

```bash
git commit -m "Initial commit for Heroku deployment"
```

6. Add the Heroku remote:

```bash
heroku git:remote -a dukani-system
```

7. Push to Heroku:

```bash
git push heroku main
```

If your main branch is named differently (e.g., master), use:

```bash
git push heroku master
```

### 4. Verify Deployment

Open the app in your browser:

```bash
heroku open
```

## Troubleshooting

### View Logs

If you encounter issues, check the Heroku logs:

```bash
heroku logs --tail
```

### Common Issues

1. **Database Connection Issues**:

   - Ensure your MongoDB Atlas IP whitelist includes Heroku's IPs or is set to allow access from anywhere (0.0.0.0/0)
   - Verify the DATABASE_URL is correct

2. **Build Failures**:

   - Check the build logs for any errors
   - Run `heroku builds:output` to see detailed build logs

3. **CORS Issues**:

   - Check browser console for CORS errors

4. **Missing Environment Variables**:

   - Verify all required environment variables are set using `heroku config`

5. **Client Build Issues**:

   - If you encounter errors with the client build process, check the build logs
   - Make sure all dependencies are properly installed

6. **Dependencies vs. DevDependencies**:

   - Heroku doesn't install devDependencies by default in production mode
   - If you encounter errors related to missing dependencies, move them from devDependencies to dependencies in package.json
   - Alternatively, you can tell Heroku to install devDependencies by setting:
     ```bash
     heroku config:set NPM_CONFIG_PRODUCTION=false
     ```

## Scaling

To scale your application:

```bash
heroku ps:scale web=1
```

## Monitoring

Monitor your application's performance:

```bash
heroku addons:create papertrail
heroku addons:create newrelic
```

## Database Backups

For MongoDB Atlas, set up backups through their dashboard.
