# macOS Development Setup Guide

Complete guide to set up and run TravelTomorrow on macOS.

## Prerequisites

### Required Software

1. **Node.js** (v20+)
   ```bash
   # Using Homebrew
   brew install node@20

   # Or download from
   https://nodejs.org/
   ```

2. **Docker Desktop**
   ```bash
   # Download and install
   https://www.docker.com/products/docker-desktop

   # Or using Homebrew
   brew install --cask docker
   ```

3. **Git**
   ```bash
   # Usually pre-installed, or
   brew install git
   ```

### Optional (for Laravel)

4. **PHP** (v8.2+)
   ```bash
   brew install php@8.2
   ```

5. **Composer**
   ```bash
   brew install composer
   ```

## Quick Start (Recommended)

The easiest way to get started:

```bash
# Clone repository
git clone https://github.com/faasile-stein/morgenopreis.git
cd morgenopreis

# Run the dev environment script
./scripts/dev-mac.sh
```

This script will:
- ✅ Check all prerequisites
- ✅ Install dependencies
- ✅ Start Docker services (Redis, MailHog)
- ✅ Start Supabase
- ✅ Run database migrations
- ✅ Start API server
- ✅ Start Laravel server (if PHP installed)

## Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# API dependencies
cd packages/api && npm install && cd ../..

# Database dependencies
cd packages/database && npm install && cd ../..

# Shared dependencies
cd packages/shared && npm install && cd ../..
```

### 2. Configure Environment Variables

```bash
# Create .env files from examples
cp packages/api/.env.example packages/api/.env
cp packages/laravel/.env.example packages/laravel/.env
```

Edit `packages/api/.env`:
```env
# You'll get these after starting Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Required for flight bookings
DUFFEL_API_KEY=duffel_test_xxxxx

# Optional for affiliates
BOOKING_AFFILIATE_ID=your_affiliate_id
```

### 3. Start Docker Services

```bash
# Start Redis and MailHog
docker-compose up -d

# Verify they're running
docker-compose ps
```

### 4. Start Supabase

```bash
cd packages/database

# Start Supabase (first time takes a few minutes)
npx supabase start

# View status and get credentials
npx supabase status
```

Copy the credentials into your `.env` file.

### 5. Run Database Migrations

```bash
cd packages/database

# Push migrations to Supabase
npx supabase db push

# Load seed data
npx supabase db reset --db-only

cd ../..
```

### 6. Start API Server

```bash
cd packages/api
npm run dev
```

API will be available at: http://localhost:3001

### 7. Start Laravel (Optional)

```bash
cd packages/laravel

# First time only - install Laravel
composer create-project laravel/laravel . "11.*"

# Copy application files (controllers, views, routes)
# See LARAVEL-QUICKSTART.md for details

# Start server
php artisan serve
```

Laravel will be available at: http://localhost:8000

## Using npm Scripts

We've added convenient npm scripts to the root `package.json`:

```bash
# Start full dev environment
npm run dev:mac

# Quick start (API only)
npm run dev:quick

# Stop all services
npm run dev:stop

# View all available scripts
npm run
```

## Testing the Setup

### 1. Test API Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T..."
}
```

### 2. Test Supabase Connection

```bash
curl http://localhost:3001/api/airports
```

Should return list of airports.

### 3. Test Wheel Spin

```bash
curl -X POST http://localhost:3001/api/wheel/spin \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 50.8503,
    "lng": 4.3517
  }'
```

### 4. View MailHog

Open http://localhost:8025 in your browser to see captured emails.

### 5. View Supabase Studio

Open http://localhost:54323 to manage your database.

### 6. Test Laravel (if installed)

Open http://localhost:8000 in your browser.

## Common Issues & Solutions

### Docker Not Running

**Error:** `Cannot connect to the Docker daemon`

**Solution:**
```bash
# Start Docker Desktop application
open -a Docker

# Wait for Docker to start, then retry
```

### Port Already in Use

**Error:** `Port 3001 is already in use`

**Solution:**
```bash
# Find and kill process using the port
lsof -ti:3001 | xargs kill -9

# Or use the stop-all script
./scripts/stop-all.sh
```

### Supabase Won't Start

**Error:** `supabase start failed`

**Solution:**
```bash
# Stop existing instance
cd packages/database
npx supabase stop

# Clear any Docker volumes
docker volume prune

# Start fresh
npx supabase start
```

### Missing Duffel API Key

**Error:** `DUFFEL_API_KEY not set`

**Solution:**
1. Sign up at https://duffel.com
2. Get test API key
3. Add to `packages/api/.env`:
   ```env
   DUFFEL_API_KEY=duffel_test_xxxxx
   ```

### Node Version Issues

**Error:** `Node version mismatch`

**Solution:**
```bash
# Install nvm (Node Version Manager)
brew install nvm

# Install and use Node 20
nvm install 20
nvm use 20

# Set as default
nvm alias default 20
```

### Permission Denied on Scripts

**Error:** `Permission denied: ./scripts/dev-mac.sh`

**Solution:**
```bash
chmod +x scripts/*.sh
```

## Development Workflow

### Daily Startup

```bash
# Option 1: One command
./scripts/dev-mac.sh

# Option 2: Using npm
npm run dev:mac
```

### Stopping Services

```bash
# Option 1: Ctrl+C in the terminal running dev-mac.sh

# Option 2: Stop script
./scripts/stop-all.sh

# Option 3: Using npm
npm run dev:stop
```

### Viewing Logs

```bash
# API logs (in API terminal)
# Automatically shown by npm run dev

# Docker logs
docker-compose logs -f

# Supabase logs
cd packages/database
npx supabase status
```

### Database Management

```bash
# View Supabase Studio
open http://localhost:54323

# Reset database (fresh start)
cd packages/database
npx supabase db reset

# Create new migration
npx supabase migration new migration_name

# Generate TypeScript types
npm run types
```

### Running Tests

```bash
# API tests
cd packages/api
npm test

# Watch mode
npm run test:watch
```

## IDE Setup

### VS Code (Recommended)

Recommended extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Vue Plugin (Volar)** - TypeScript support
- **Tailwind CSS IntelliSense** - CSS autocomplete
- **Docker** - Docker management
- **Laravel Extension Pack** - Laravel support

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["typescript"],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### PhpStorm (for Laravel)

Recommended plugins:
- Laravel
- Tailwind CSS
- Blade formatter

## Performance Tips

### Faster Supabase Startup

```bash
# Allocate more memory to Docker Desktop
# Docker Desktop → Settings → Resources
# Increase Memory to 8GB+
```

### Speed Up npm install

```bash
# Use pnpm instead of npm (faster)
brew install pnpm

# Install dependencies
pnpm install
```

### Disable Unused Services

Edit `docker-compose.yml` to comment out services you don't need:
```yaml
# Comment out MailHog if not testing emails
# mailhog:
#   image: mailhog/mailhog
#   ...
```

## Next Steps

1. **Get API Keys**
   - Sign up for Duffel: https://duffel.com
   - Get test API key
   - Add to `.env`

2. **Read Documentation**
   - API docs: `docs/api/`
   - Supabase: `docs/SUPABASE-ARCHITECTURE.md`
   - Laravel: `packages/laravel/LARAVEL-QUICKSTART.md`

3. **Start Coding**
   - Create a feature branch
   - Make changes
   - Run tests
   - Commit with conventional commits

4. **Join the Team**
   - Review coding guidelines
   - Set up pre-commit hooks (Husky)
   - Review PR process

## Troubleshooting

Still having issues? Check:

1. **GitHub Issues**: https://github.com/faasile-stein/morgenopreis/issues
2. **Supabase Docs**: https://supabase.com/docs
3. **Docker Docs**: https://docs.docker.com/desktop/install/mac-install/

## Updating

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install
cd packages/api && npm install && cd ../..

# Update Supabase
cd packages/database
npx supabase stop
npx supabase start
npx supabase db reset
cd ../..

# Restart services
./scripts/dev-mac.sh
```

Happy coding! 🚀
