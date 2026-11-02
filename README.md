# Recipe Book Backend

Empty Express.js + TypeScript backend starter based on the AppsDev API Setup Tutorial.

## Requirements

- Node.js v24 or newer
- npm
- Visual Studio Code

## Setup in VS Code

1. Extract this ZIP folder.
2. Open the `recipe-book-backend` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Install the dependencies:

   ```bash
   npm install
   ```

5. Copy `.env.example` and rename the copy to `.env`.
6. Start the development server:

   ```bash
   npm run dev
   ```

7. Test `http://localhost:7000/api/health` in a browser or Postman.

Expected response includes `"status": "success"` and `"message": "API is healthy"`.

## Available scripts

- `npm run dev` — start development server with automatic restart
- `npm run build` — build the TypeScript API
- `npm start` — run the production build
- `npm run lint` — run ESLint
- `npm run db:plan` — generate Drizzle migrations after defining the schema
- `npm run db:migrate` — apply pending Drizzle migrations
- `npm run db:studio` — open Drizzle Studio

## Project structure

```text
recipe-book-backend/
├── drizzle/                 # Drizzle migrations (initially empty)
├── src/
│   ├── config/              # Environment configuration
│   ├── controllers/         # Request handlers
│   ├── db/                  # Drizzle schema and database connection
│   ├── lib/                 # Shared integrations and helpers
│   ├── middlewares/         # Express middleware
│   ├── repositories/        # Database access
│   ├── routes/              # Route definitions
│   ├── schema/              # Zod validation schemas
│   ├── services/             # Application business logic
│   └── utils/                # Reusable utilities
├── .env.example
├── drizzle.config.ts
├── eslint.config.ts
├── package.json
└── tsconfig.json
```

This is intentionally an empty feature scaffold. The Express server and health-check endpoints are included so you can verify Express is installed and running. Recipe features, authentication, and database tables have not been implemented yet.

Never commit your real `.env` file. Create or change database tables through Drizzle schema and migrations, not manually in the database UI.
