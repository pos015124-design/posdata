# Dukani E-commerce Platform

A comprehensive multi-tenant e-commerce platform built with React, Node.js, and MongoDB. Dukani enables businesses to create and manage their online stores with advanced features like inventory management, order processing, customer management, and analytics.

**Note: The main implementation is located in the [dukani-system/](./dukani-system/) directory. This root directory contains legacy files that have been preserved for reference.**

## 🚀 Features

### Multi-Tenant Architecture

- **Business Registration**: Streamlined onboarding process for new businesses
- **Tenant Isolation**: Complete data separation between businesses
- **Role-Based Access Control**: Super Admin, Business Admin, Staff, and Customer roles
- **Scalable Infrastructure**: Designed to handle thousands of businesses

### E-commerce Core

- **Product Management**: Advanced inventory tracking with variants, categories, and analytics
- **Shopping Cart**: Session-based cart with customer account integration
- **Order Management**: Complete order lifecycle from creation to fulfillment
- **Customer Accounts**: Registration, authentication, and profile management
- **Public Catalog**: SEO-optimized product browsing and search

### Business Management

- **Dashboard Analytics**: Real-time insights into sales, customers, and performance
- **Inventory Control**: Stock tracking, low-stock alerts, and reorder management
- **Customer Management**: Customer profiles, order history, and communication
- **Staff Management**: User roles and permissions for team collaboration

### Platform Administration

- **Super Admin Dashboard**: Platform-wide analytics and business management
- **Business Approval System**: Review and approve new business registrations
- **System Health Monitoring**: Database, server, and performance metrics
- **Platform Settings**: Global configuration and feature management

## 🛠 Technology Stack

### Frontend

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **React Router** for navigation
- **Recharts** for data visualization
- **Lucide React** for icons

### Backend

- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Winston** for logging
- **Express Validator** for input validation

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dukani-ecommerce
```

### 2. Navigate to the Main Implementation

```bash
cd dukani-system
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Environment Setup

Create a `.env` file in the server directory:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/dukani

# Authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
REFRESH_TOKEN_SECRET=your-refresh-token-secret-at-least-32-characters-long

# Server
PORT=5000
NODE_ENV=development

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
SESSION_SECRET=your-session-secret-at-least-32-characters-long

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Business Configuration
DEFAULT_CURRENCY=USD
DEFAULT_TAX_RATE=0
DEFAULT_TIMEZONE=UTC
```

### 5. Start Development Servers

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start backend server
cd server
npm run dev

# Terminal 3: Start frontend development server
cd client
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Landing Page**: http://localhost:5173/landing
- **Health Check**: http://localhost:5000/health

## Project Structure

```
dukani-system/                 # Main implementation
├── client/                    # React frontend
│   ├── public/                # Static assets
│   └── src/                   # Source code
│       ├── api/               # API client
│       ├── components/        # UI components
│       ├── contexts/          # React contexts
│       ├── hooks/             # Custom hooks
│       ├── lib/               # Utility functions
│       ├── pages/             # Page components
│       └── types/             # TypeScript types
├── server/                    # Express backend
│   ├── config/                # Configuration
│   ├── models/                # Mongoose models
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   └── utils/                 # Utility functions
└── docs/                      # Documentation
```

## Documentation

- [API Documentation](./dukani-system/API_DOCUMENTATION.md)
- [Deployment Guide](./dukani-system/DEPLOYMENT_GUIDE.md)
- [Migration Guide](./dukani-system/MIGRATION_GUIDE.md)

## License

MIT License