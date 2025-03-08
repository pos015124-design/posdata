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
# For the DATABASE_URL, use quotes to handle special characters
heroku config:set "DATABASE_URL=mongodb+srv://dukani:1bKAx0SismDokGpL@cluster0.abild.mongodb.net/dukaniDB?retryWrites=true&w=majority&appName=Cluster0"

# Alternative method if quotes don't work
heroku config:set DATABASE_URL="mongodb+srv://dukani:1bKAx0SismDokGpL@cluster0.abild.mongodb.net/dukaniDB?retryWrites=true&w=majority&appName=Cluster0"

# Or escape the ampersands
heroku config:set DATABASE_URL=mongodb+srv://dukani:1bKAx0SismDokGpL@cluster0.abild.mongodb.net/dukaniDB?retryWrites=true\&w=majority\&appName=Cluster0

# Set other required environment variables
heroku config:set JWT_SECRET=exrev-secret
heroku config:set NODE_ENV=production
```

### 3. Set Up Git Repository for Heroku

If you've already created a Heroku app and tried to clone it inside your existing project directory, you might have encountered Git repository conflicts. Here's how to properly set up your Git repository for Heroku deployment:

#### Fixing Embedded Git Repository Issue

If you see an error like this:

```
warning: adding embedded git repository: dukani-system
hint: You've added another git repository inside your current repository.
```

Follow these steps to fix it:

1. Remove the embedded repository from the Git index:

```bash
git rm --cached dukani-system
```

2. Remove the cloned directory:

```bash
rm -rf dukani-system
```

3. Make sure you're in the root directory of your project:

```bash
cd /path/to/dukani-system
```

#### Setting Up Git for Heroku

1. Initialize a Git repository (if not already initialized):

```bash
git init
```

2. Add all files to the repository:

```bash
git add .
```

3. Commit the changes:

```bash
git commit -m "Initial commit for Heroku deployment"
```

4. Add the Heroku remote:

```bash
heroku git:remote -a dukani-system
```

5. Push to Heroku:

```bash
git push heroku main
```

If your main branch is named differently (e.g., master), use:

```bash
git push heroku master
```

### 4. Create an Admin User

After deploying, create an admin user with the following command:

```bash
heroku run npm run create-admin
```

This will create an admin user with the following credentials:

- Email: admin@dukani.com
- Password: admin123

### 5. Verify Deployment

Open the app in your browser:

```bash
heroku open
```

You should now be able to log in with the admin credentials.

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

2. **TypeScript Build Failures**:

   - If you see an error like `sh: 1: tsc: not found`, it means TypeScript is not available during the build
   - We've updated the client's package.json to:
     - Move TypeScript from devDependencies to dependencies
     - Modify the build script to not require TypeScript compilation
   - If you still encounter issues, you can set:
     ```bash
     heroku config:set NPM_CONFIG_PRODUCTION=false
     ```
     This will install devDependencies, but may increase your build time
   - Check the build logs for any errors using:
     ```bash
     heroku builds:output
     ```

3. **Environment Variable Parsing Errors**:

   - If you see errors like `zsh: parse error near '&'` when setting DATABASE_URL, use one of these methods:
     - Use quotes around the entire command:
       ```bash
       heroku config:set "DATABASE_URL=mongodb+srv://user:pass@host/db?retryWrites=true&w=majority"
       ```
     - Use quotes around the value:
       ```bash
       heroku config:set DATABASE_URL="mongodb+srv://user:pass@host/db?retryWrites=true&w=majority"
       ```
     - Escape the special characters:
       ```bash
       heroku config:set DATABASE_URL=mongodb+srv://user:pass@host/db?retryWrites=true\&w=majority
       ```

4. **CORS Issues**:

   - Check browser console for CORS errors

5. **Missing Environment Variables**:

   - Verify all required environment variables are set using `heroku config`

6. **Client Build Issues**:

   - If you encounter errors with the client build process, check the build logs
   - Make sure all dependencies are properly installed

7. **Dependencies vs. DevDependencies**:

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
