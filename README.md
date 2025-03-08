# Dukani System

A retail management system for tracking inventory, sales, and customers.

## Features

- Inventory management
- Sales tracking
- Customer management
- Staff management
- Analytics and reporting
- Expense tracking

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express
- **Database**: MongoDB

## Local Development

### Prerequisites

- Node.js (>= 18.x)
- npm (>= 9.x)
- MongoDB

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/dukani-system.git
cd dukani-system
```

2. Install dependencies:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

3. Create a `.env` file in the server directory:

```
DATABASE_URL=mongodb+srv://dukani:1bKAx0SismDokGpL@cluster0.abild.mongodb.net/dukaniDB?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=exrev-secret
NODE_ENV=development
```

4. Start the development server:

```bash
npm run dev
```

This will start both the client and server in development mode.

## Deployment

### Heroku Deployment

See [HEROKU_DEPLOYMENT.md](./HEROKU_DEPLOYMENT.md) for detailed instructions on deploying to Heroku.

## Project Structure

```
dukani-system/
├── client/             # React frontend
│   ├── public/         # Static assets
│   └── src/            # Source code
│       ├── api/        # API client
│       ├── components/ # UI components
│       ├── contexts/   # React contexts
│       ├── hooks/      # Custom hooks
│       ├── lib/        # Utility functions
│       ├── pages/      # Page components
│       └── types/      # TypeScript types
├── server/             # Express backend
│   ├── config/         # Configuration
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
└── api/                # API functions (for serverless deployment)
```

## License

ISC
