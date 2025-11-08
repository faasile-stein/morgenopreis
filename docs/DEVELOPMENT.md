# TravelTomorrow Development Guide

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- Docker and Docker Compose
- Git

### Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/faasile-stein/morgenopreis.git
cd morgenopreis
```

2. Run the setup script:
```bash
npm run setup
```

This will:
- Install all dependencies
- Create environment files from templates
- Start Docker services (PostgreSQL, Redis, MailHog)
- Set up git hooks with Husky

3. Configure your environment:
- Edit `packages/api/.env` with your API keys
- Edit `packages/web/.env.local` with web-specific config

4. Run database migrations:
```bash
npm run migrate:dev
```

5. Seed the database with sample data:
```bash
npm run seed:dev
```

6. Start development servers:
```bash
npm run dev
```

## Project Structure

```
morgenopreis/
├── .github/workflows/       # CI/CD pipelines
├── packages/
│   ├── api/                 # Node.js/Express API server
│   ├── web/                 # Next.js web application
│   ├── mobile/              # React Native/Expo app
│   ├── drupal/              # Drupal CMS
│   ├── shared/              # Shared TypeScript types & utilities
│   └── database/            # Prisma schema & migrations
├── infrastructure/          # Terraform & deployment configs
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── docker-compose.yml       # Local development services
```

## Available Commands

### Root Level
- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages

### Docker
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:reset` - Reset Docker services (remove volumes)

### Database
- `npm run migrate:dev` - Run migrations in development
- `npm run migrate:prod` - Deploy migrations to production
- `npm run seed:dev` - Seed database with sample data

### Integrations
- `npm run check:integrations` - Check third-party API connections

## Development Workflow

### Working on a Feature

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Run tests and linting:
```bash
npm run test
npm run lint
```

4. Commit your changes (Husky will run pre-commit hooks):
```bash
git add .
git commit -m "feat(scope): your commit message"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) format.

5. Push and create a pull request:
```bash
git push origin feature/your-feature-name
```

### Commit Message Format

We use Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Scopes:**
- `api`, `web`, `mobile`, `drupal`, `shared`, `database`, `infra`, `ci`

**Examples:**
```bash
git commit -m "feat(api): add user authentication endpoints"
git commit -m "fix(web): resolve wheel animation bug"
git commit -m "docs(api): update API documentation"
```

## Running Individual Packages

### API Server
```bash
cd packages/api
npm run dev
```
Access at: http://localhost:3001

### Web App
```bash
cd packages/web
npm run dev
```
Access at: http://localhost:3000

### Mobile App
```bash
cd packages/mobile
npm run dev
```

## Testing

### Unit Tests
```bash
npm run test --workspace=packages/api
npm run test --workspace=packages/web
```

### Integration Tests
```bash
npm run test:integration --workspace=packages/api
```

### E2E Tests
```bash
npm run test:e2e --workspace=packages/web
```

## Docker Services

### PostgreSQL
- **Port:** 5432
- **Database:** traveltomorrow_dev
- **User:** dev
- **Password:** devpass

Access via:
```bash
psql postgresql://dev:devpass@localhost:5432/traveltomorrow_dev
```

### Redis
- **Port:** 6379

Access via:
```bash
redis-cli -h localhost -p 6379
```

### MailHog (Email Testing)
- **SMTP Port:** 1025
- **Web UI:** http://localhost:8025

All emails sent in development are caught by MailHog.

### Drupal
- **Port:** 8080
- **URL:** http://localhost:8080

## Environment Variables

### API (.env)
See `packages/api/.env.example` for all available variables.

Key variables:
- `DUFFEL_API_KEY` - Duffel API key for flight data
- `STRIPE_SECRET_KEY` - Stripe for payments
- `BOOKING_AFFILIATE_ID` - Booking.com affiliate ID
- `JWT_SECRET` - Secret for JWT tokens

### Web (.env.local)
See `packages/web/.env.example` for all available variables.

Key variables:
- `NEXT_PUBLIC_API_URL` - API server URL
- `NEXT_PUBLIC_DRUPAL_URL` - Drupal CMS URL

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
npm run docker:down
npm run docker:up
```

### Database Connection Issues
```bash
npm run docker:reset
npm run migrate:dev
```

### Clear All and Start Fresh
```bash
npm run docker:down
rm -rf node_modules packages/*/node_modules
npm install
npm run docker:up
npm run migrate:dev
npm run seed:dev
```

### Husky Git Hooks Not Working
```bash
npx husky install
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

## CI/CD

GitHub Actions workflows run on:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

Workflows:
- **API CI** - Tests, linting, type checking for API
- **Web CI** - Tests, linting, build for web
- **Mobile CI** - Tests, linting for mobile
- **Lint** - Code quality checks

## Code Quality

### ESLint
```bash
npm run lint
npm run lint:fix
```

### Prettier
```bash
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

### Type Checking
```bash
npm run type-check
```

## Third-Party Integrations

### Duffel (Flights)
- Get test API key from: https://duffel.com
- Add to `packages/api/.env`
- Documentation: https://duffel.com/docs/api

### Booking.com (Accommodations)
- Sign up for affiliate program
- Add affiliate ID to `packages/api/.env`

### Stripe (Payments)
- Get test keys from: https://stripe.com
- Add to `packages/api/.env`

## Next Steps

1. Complete Stage 1: Foundations (database schema, API setup)
2. Implement Stage 2: Wheel MVP
3. See individual stage documentation in project root:
   - `00-project-setup.md` ✅
   - `01-foundations.md`
   - `02-wheel-mvp.md`
   - etc.

## Getting Help

- Check existing documentation in `/docs`
- Review stage plans in root directory
- Ask in team chat or create an issue
