# PennyWise - User Service

The User Service is a core component of the PennyWise micro-investment platform. It manages user authentication, profile data, and identity across services. This service integrates with Auth0 for secure OAuth2-based login and implements RBAC to enable fine-grained access control. Inter-service communication is handled via gRPC.

## Architecture

This service is built with:

* Node.js and Express.js for HTTP APIs
* TypeScript for type safety
* PostgreSQL and Prisma for data persistence
* Auth0 for authentication and role-based authorization
* AES-256-GCM encryption for secure token storage
* gRPC for service-to-service communication
* Docker for containerization

## Features

* User registration and authentication via Auth0 OAuth2
* CRUD operations on user profiles and settings
* Refresh token management (securely encrypted in DB)
* gRPC interface for internal service consumption
* CI pipeline with type checks, linting, and tests
* Logging to centralized Logger Service
* Containerized via Docker

## Folder Structure

```
user-service/
├── src/
│   ├── controllers/    # Route handlers
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── middlewares/    # Express middlewares
│   ├── schema/         # Zod schemas
│   ├── clients/        # External service clients (e.g. Prisma, Auth0)
│   ├── grpc/           # gRPC client/server definitions
│   └── utils/          # Helpers (e.g. encryption)
├── prisma/             # Prisma schema and migrations
├── .env                # Environment variables
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

### 1. Clone the repo

```
git clone https://github.com/YOUR_ORG_NAME/pennywise-user-service.git
cd pennywise-user-service
```

### 2. Install dependencies

```
npm install
```

### 3. Create .env

```
DATABASE_URL=postgresql://...
AUTH0_DOMAIN=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
REFRESH_TOKEN_ENCRYPTION_KEY=...  # base64 encoded 32-byte key
AUTH0_REFRESH_TOKEN_EXPIRY=31557600
```

### 4. Prisma setup

```
npx prisma generate
npx prisma migrate dev --name init
```

## Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| dev             | Start dev server with ts-node-dev |
| build           | Compile TypeScript to JavaScript  |
| start           | Run compiled JavaScript           |
| lint            | Run ESLint                        |
| test            | Run unit tests                    |
| prisma\:migrate | Run database migrations           |

## API Overview

Full OpenAPI docs coming soon

### POST /api/users/register

Create a new user via Auth0.

### GET /api/users/me

Get the current user’s profile (requires access token).

### PUT /api/users/\:id/settings

Update user preferences and settings.

### POST /api/tokens/rotate

Securely rotate refresh token using AES-256-GCM.

## gRPC

This service also exposes gRPC endpoints to allow internal services to:

* Fetch user metadata
* Verify and decode JWTs
* Query roles and permissions

Proto files are located in the `proto/` repo and consumed using TypeScript client bindings.

## Security Notes

* All sensitive tokens are encrypted at rest using AES-256-GCM.
* Only authenticated users with valid roles and scopes can access protected endpoints.
* Rate-limiting, input validation via Zod, and structured logging are implemented.

## Docker

### Development

```
docker-compose up --build
```

### Production

```
docker build -t pennywise-user-service .
docker run -p 3000:3000 --env-file .env pennywise-user-service
```

## CI/CD

CI pipeline includes:

* Linting and TypeScript checks
* Unit test execution
* Deployment workflow (coming soon)

GitHub Actions configuration lives in `.github/workflows/ci.yml`

## License

This project is licensed under the MIT License.

## Contributing

Since this is a solo project, contribution is currently closed. You are welcome to fork the repo or suggest improvements via issues.

## Contact

For issues, use GitHub Issues: [https://github.com/Pennywise-Org/user-service/issues](https://github.com/Pennywise-Org/user-service/issues)

Email: [sankirthk@gmail.com](mailto:sankirthk@gmail.com)
