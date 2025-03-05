# Dukani System

A retail management system with POS, inventory management, staff management, and reporting features.

## Database Management

### Resetting the Database

If you need to start fresh with a clean database, you can use the provided reset script:

```bash
# Navigate to the server directory
cd server

# Run the reset script
node resetDatabase.js
```

This script will:

1. Drop all collections in the database
2. Create a new admin user
3. Output the admin credentials

**WARNING**: This will delete all data in the database. Make sure you have backups if needed.

### Creating an Admin User

If you just need to create an admin user without resetting the database:

```bash
# Navigate to the server directory
cd server

# Run the admin creation script
node createAdmin.js
```

This will create an admin user with the following credentials:

- Email: admin@dukani.com
- Password: admin123
- Role: admin (with full access to all system features)
- All permissions enabled (dashboard, POS, inventory, customers, staff, reports, settings)

If an admin user already exists, the script will not create a new one.

> **Note:** You may see a warning about duplicate schema indexes on the email field. This is just a warning, not an error, and can be safely ignored. It occurs because the email field is marked as unique in the User model, which automatically creates an index.

## Running the Application

### Server

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

### Client

```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Features

- Point of Sale (POS) system
- Inventory management
- Staff management
- Customer management
- Expense tracking
- Reporting and analytics
- User permissions and role-based access control

## User Roles and Permissions

The system uses a combination of roles and permissions for access control:

### Roles

There are two models that store role information:

1. **User Model**: Contains the authentication role ('admin' or 'user')
2. **Staff Model**: Contains the business role ('Manager', 'Sales Clerk', etc.)

When you create a user with the `createAdmin.js` script, it creates:

- A User record with role='admin'
- A Staff record with role='Manager'

### Permissions

Each user has specific permissions that determine which parts of the system they can access:

- **dashboard**: Access to the main dashboard
- **pos**: Access to the Point of Sale system
- **inventory**: Access to inventory management
- **customers**: Access to customer management
- **staff**: Access to staff management
- **reports**: Access to reports and analytics
- **settings**: Access to system settings

When creating or editing a user, you can set these permissions individually. A user will only be able to access the pages for which they have the corresponding permission enabled.

**Important**: All users are restricted by their specific permission settings, regardless of their role. The system will:

1. **Hide navigation tabs** for features the user doesn't have permission to access
2. **Prevent direct URL access** to restricted pages
3. **Show an "Unauthorized" page** if a user attempts to access a restricted area

Make sure to enable the appropriate permissions for each user based on their responsibilities.
