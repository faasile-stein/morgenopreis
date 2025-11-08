# TravelTomorrow - Quick Start Guide

Get up and running in 5 minutes! 🚀

## Prerequisites

**Required:**
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Optional (for Laravel):**
- [PHP 8.2+](https://www.php.net/)
- [Composer](https://getcomposer.org/)

**macOS Installation:**
```bash
brew install node@20 docker
brew install --cask docker
brew install php@8.2 composer  # Optional
```

## One-Command Setup

```bash
# Clone repository
git clone https://github.com/faasile-stein/morgenopreis.git
cd morgenopreis

# Start everything (macOS)
npm run dev:mac
```

That's it! 🎉

## What You Get

After running the script:

```
✅ Services Running:

  API Server:          http://localhost:3001
  API Health:          http://localhost:3001/health

  Supabase Studio:     http://localhost:54323
  Supabase API:        http://localhost:54321

  Redis:               localhost:6379

  MailHog SMTP:        localhost:1025
  MailHog Web:         http://localhost:8025

  Laravel Website:     http://localhost:8000
```

## Quick Test

### 1. Check API
```bash
curl http://localhost:3001/health
```

### 2. Spin the Wheel
```bash
curl -X POST http://localhost:3001/api/wheel/spin \
  -H "Content-Type: application/json" \
  -d '{"lat": 50.8503, "lng": 4.3517}'
```

### 3. View Emails
Open http://localhost:8025 in your browser

### 4. Manage Database
Open http://localhost:54323 in your browser

## Get Duffel API Key

1. Sign up at https://duffel.com
2. Get your test API key
3. Add to `packages/api/.env`:
   ```env
   DUFFEL_API_KEY=duffel_test_xxxxx
   ```
4. Restart API: `Ctrl+C` then `npm run dev:mac`

## Common Commands

```bash
# Start full environment
npm run dev:mac

# Start API only (faster)
npm run dev:quick

# Stop all services
npm run dev:stop

# View Supabase status
npm run supabase:status

# Open Supabase Studio
npm run supabase:studio
```

## Project Structure

```
morgenopreis/
├── packages/
│   ├── api/           # Express API (Duffel, Supabase)
│   ├── web/           # Next.js frontend
│   ├── mobile/        # Expo mobile app
│   ├── laravel/       # Laravel SEO website
│   ├── shared/        # Shared TypeScript types
│   └── database/      # Supabase migrations
├── scripts/           # Development scripts
└── docs/              # Documentation
```

## API Endpoints

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Current user

**Wheel & Offers:**
- `POST /api/wheel/spin` - Spin wheel for destinations
- `GET /api/airports` - List airports
- `GET /api/airports/nearest` - Find nearest airport

**Bookings:**
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List bookings
- `GET /api/bookings/:id` - Booking details

**Price Alerts:**
- `POST /api/alerts` - Create price alert
- `GET /api/alerts` - List alerts
- `PATCH /api/alerts/:id` - Update alert

**Admin:**
- `GET /api/admin/stats` - Platform statistics
- `POST /api/admin/destinations` - Manage destinations

## Laravel Pages

**Public Pages:**
- `/` - Homepage
- `/destinations` - All destinations
- `/destinations/{slug}` - Single destination
- `/weekend-trips` - Weekend category
- `/sitemap.xml` - SEO sitemap

## Development Workflow

### Daily Startup
```bash
npm run dev:mac
```

### Make Changes
- API code auto-reloads
- Edit files in `packages/api/src/`
- Changes reflected immediately

### View Logs
- API logs shown in terminal
- Docker logs: `docker-compose logs -f`

### Stop Services
Press `Ctrl+C` or run:
```bash
npm run dev:stop
```

## Troubleshooting

### Port Already in Use
```bash
npm run dev:stop
npm run dev:mac
```

### Docker Not Running
```bash
# Start Docker Desktop app
open -a Docker
# Wait, then retry
npm run dev:mac
```

### Supabase Issues
```bash
cd packages/database
npx supabase stop
npx supabase start
```

### Fresh Start
```bash
npm run dev:stop
docker-compose down -v
npm run dev:mac
```

## Testing

### API Tests
```bash
cd packages/api
npm test
```

### Test Wheel Spin
```bash
curl -X POST http://localhost:3001/api/wheel/spin \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 50.8503,
    "lng": 4.3517,
    "preferences": {"budget": "medium"}
  }'
```

### Test Authentication
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Database Management

### View Data
```bash
# Open Supabase Studio
open http://localhost:54323
```

### Reset Database
```bash
cd packages/database
npx supabase db reset
```

### Create Migration
```bash
cd packages/database
npx supabase migration new my_migration
# Edit the file in supabase/migrations/
npx supabase db push
```

## Next Steps

1. **Read Full Docs**
   - macOS Setup: `docs/MACOS-SETUP.md`
   - API Docs: `docs/api/`
   - Architecture: `docs/SUPABASE-ARCHITECTURE.md`

2. **Get API Keys**
   - Duffel: https://duffel.com
   - Booking.com: https://www.booking.com/affiliate

3. **Start Coding**
   - Create feature branch
   - Make changes
   - Test locally
   - Commit and push

4. **Join Development**
   - Review coding guidelines
   - Set up git hooks
   - Review PR process

## Environment Files

**API (`.env`):**
```env
# Supabase (auto-configured by script)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Required
DUFFEL_API_KEY=duffel_test_xxxxx

# Optional
BOOKING_AFFILIATE_ID=your_id
```

**Laravel (`.env`):**
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=54322
DB_DATABASE=postgres
APP_URL=http://localhost:8000
```

## Key Features

✅ **Wheel Spin** - Smart destination selection
✅ **Flight Booking** - Duffel API integration
✅ **Price Alerts** - Email notifications
✅ **Price History** - Historical analysis
✅ **Affiliates** - Booking.com links
✅ **Analytics** - Conversion tracking
✅ **SEO Website** - Laravel with JSON-LD
✅ **Admin Panel** - Content management

## Support

- 📖 **Documentation**: `docs/`
- 🐛 **Issues**: GitHub Issues
- 💬 **Questions**: Team Chat

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  TravelTomorrow - Quick Reference                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Start Dev:       npm run dev:mac                  │
│  Stop All:        npm run dev:stop                 │
│  Quick Start:     npm run dev:quick                │
│                                                     │
│  API:             http://localhost:3001            │
│  Supabase:        http://localhost:54323           │
│  MailHog:         http://localhost:8025            │
│  Laravel:         http://localhost:8000            │
│                                                     │
│  Logs:            docker-compose logs -f           │
│  Reset DB:        cd packages/database &&          │
│                   npx supabase db reset            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Happy coding! 🎉
