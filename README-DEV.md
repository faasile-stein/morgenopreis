# TravelTomorrow - Developer Guide

> Monorepo for the TravelTomorrow / MorgenOpreis.be platform

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- Docker and Docker Compose
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/faasile-stein/morgenopreis.git
cd morgenopreis

# Run setup script
npm run setup

# Run database migrations (after Docker services are up)
npm run migrate:dev

# Seed database
npm run seed:dev

# Start development
npm run dev
```

For detailed setup instructions, see [Development Guide](docs/DEVELOPMENT.md).

## Project Structure

This is a monorepo containing:

```
morgenopreis/
├── .github/workflows/       # CI/CD pipelines
├── packages/
│   ├── api/                 # Node.js/Express API server
│   ├── web/                 # Next.js web application
│   ├── mobile/              # React Native/Expo mobile app
│   ├── laravel/             # Laravel CMS
│   ├── shared/              # Shared TypeScript types & utilities
│   └── database/            # Prisma schema & migrations
├── infrastructure/          # Terraform & deployment configs
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
└── docker-compose.yml       # Local development services
```

## Technology Stack

**Backend:**
- Node.js 20+ with TypeScript
- Express.js
- PostgreSQL 15+ with Prisma ORM
- Redis for caching

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS
- Framer Motion

**Mobile:**
- Expo SDK 50+
- React Native

**CMS:**
- Laravel 11+

**Integrations:**
- Duffel API (flights)
- Booking.com (accommodations)
- Stripe (payments)

## Available Commands

### Development
```bash
npm run dev              # Start all development servers
npm run dev:api          # Start API server only
npm run dev:web          # Start web app only
npm run dev:mobile       # Start mobile app only
```

### Building
```bash
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all packages
npm run type-check       # Type check all packages
```

### Docker Services
```bash
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:reset     # Reset Docker services (remove volumes)
```

### Database
```bash
npm run migrate:dev      # Run migrations in development
npm run migrate:prod     # Deploy migrations to production
npm run seed:dev         # Seed database with sample data
```

## Development Stages

The project is being developed in phases:

- ✅ **Stage 0: Project Setup** - Monorepo structure, Docker, CI/CD (COMPLETED)
- 🔄 **Stage 1: Foundations** - Database schema, API, authentication (IN PROGRESS)
- 📋 **Stage 2: Wheel MVP** - Spin wheel UI, Duffel integration
- 📋 **Stage 3: SEO & Editorial** - Laravel pages, JSON-LD
- 📋 **Stage 4: Price Alerts** - Alert system, email campaigns
- 📋 **Stage 5: Affiliates** - Booking.com integration
- 📋 **Stage 6: Mobile App** - React Native app
- 📋 **Stage 7: Admin Dashboard** - Admin UI
- 📋 **Stage 8: Testing & QA** - Comprehensive testing
- 📋 **Stage 9: Deployment** - Production deployment

See individual stage documentation files for details:
- [00-project-setup.md](00-project-setup.md) ✅
- [01-foundations.md](01-foundations.md) 🔄
- [02-wheel-mvp.md](02-wheel-mvp.md)
- [03-seo-editorial.md](03-seo-editorial.md)
- [04-price-alerts.md](04-price-alerts.md)
- [05-affiliates-extras.md](05-affiliates-extras.md)
- [06-mobile-app.md](06-mobile-app.md)
- [07-admin-dashboard.md](07-admin-dashboard.md)
- [08-testing-qa.md](08-testing-qa.md)
- [09-deployment-cicd.md](09-deployment-cicd.md)

## Documentation

- [Development Guide](docs/DEVELOPMENT.md) - Setup and development workflow
- [API Documentation](docs/api/) - API endpoints and contracts
- [Architecture](docs/architecture/) - System architecture diagrams
- [Product Overview](README.md) - Product details and features

## Docker Services

When you run `npm run docker:up`, the following services start:

- **PostgreSQL** - Port 5432 (Database)
- **Redis** - Port 6379 (Caching)
- **MailHog** - Port 8025 (Email testing UI)
- **Laravel** - Port 6800 (CMS - when configured)

## Environment Variables

Each package has its own `.env.example` file:

- `packages/api/.env.example` - API server configuration
- `packages/web/.env.example` - Web app configuration
- `packages/mobile/.env.example` - Mobile app configuration

Copy these to `.env` files and fill in your API keys and secrets.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Commit using conventional commits format
5. Push and create a pull request

See [Development Guide](docs/DEVELOPMENT.md) for detailed workflow.

## CI/CD

GitHub Actions workflows run automatically on push and pull requests:

- **API CI** - Tests, linting, type checking
- **Web CI** - Tests, linting, build
- **Mobile CI** - Tests, linting
- **Lint** - Code quality checks

## Next Steps

1. ✅ Complete Stage 0: Project Setup
2. 🔄 Implement Stage 1: Foundations
   - Set up Prisma schema
   - Create API authentication
   - Seed airport data
3. Move to Stage 2: Wheel MVP

## Getting Help

- Check [Development Guide](docs/DEVELOPMENT.md)
- Review stage documentation files
- Check [Product Overview](README.md) for business context
