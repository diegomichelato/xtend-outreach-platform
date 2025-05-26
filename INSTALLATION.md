# Xtend Creators - O.S.

## Installation

1. Extract this zip file to a directory
2. Run `npm install` to install dependencies
3. Set up your environment variables in a `.env` file
4. Start the development server with `npm run dev`

## Database Setup

To set up the database:

1. Configure your database connection in `.env` file
2. Run `npm run db:push` to create all database tables
3. Run `node setup-database-tables.js` to initialize basic data

## Contact Import

To import your contacts:

1. Use the Contact Import feature in the platform
2. Or run `node import-contacts-from-excel.mjs` with your contacts file

## Documentation

Refer to the docs directory for detailed documentation.

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"

# Security
JWT_SECRET="your-secure-secret-key"

# Server Configuration
PORT=3000
NODE_ENV="development"
