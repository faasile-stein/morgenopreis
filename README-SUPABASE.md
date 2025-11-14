# TravelTomorrow - Now with Supabase! 🚀

## What's New?

We've migrated from Prisma + self-hosted PostgreSQL to **Supabase** as our backend platform!

### Benefits
- ✅ Built-in Authentication (no custom JWT needed)
- ✅ Row Level Security (database-level security)
- ✅ Real-time subscriptions (live price updates)
- ✅ Auto-generated REST API
- ✅ Type-safe with generated TypeScript types
- ✅ Built-in file storage
- ✅ Generous free tier ($0/month for development)

## Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Start Local Supabase

```bash
cd packages/database
npm run supabase:start
```

This starts local Docker containers:
- PostgreSQL (port 64322)
- PostgREST API (port 64321)
- Auth server
- Supabase Studio (port 64323)
- Email testing (port 64324)

### 3. Get Your Credentials

After `supabase start`, you'll see:

```
API URL: http://127.0.0.1:64321
anon key: eyJh...
service_role key: eyJh...
```

### 4. Update Environment Variables

Copy the keys to your `.env` files:

**packages/api/.env:**
```env
SUPABASE_URL=http://127.0.0.1:64321
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-role-key>
```

**packages/web/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:64321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 5. View Database in Supabase Studio

Open http://127.0.0.1:64323 in your browser to see:
- Tables & data
- Run SQL queries
- Manage auth users
- View logs
- Edit RLS policies

### 6. Start Development

```bash
# Terminal 1: Supabase (already running from step 2)
cd packages/database
npm run supabase:start

# Terminal 2: Redis & MailHog
npm run docker:up

# Terminal 3: API Server
cd packages/api
npm run dev

# Terminal 4: Web App (Stage 2+)
cd packages/web
npm run dev
```

## What Changed?

### Removed
- ❌ Prisma ORM
- ❌ Custom JWT authentication
- ❌ Self-hosted PostgreSQL
- ❌ Manual session management

### Added
- ✅ Supabase Client (`@supabase/supabase-js`)
- ✅ Supabase Auth (GoTrue)
- ✅ SQL migrations (`packages/database/supabase/migrations/`)
- ✅ Row Level Security policies
- ✅ Auto-generated TypeScript types

## Database Schema

All tables are created with SQL migrations in:
- `packages/database/supabase/migrations/20250108000001_initial_schema.sql`
- `packages/database/supabase/migrations/20250108000002_rls_policies.sql`

Seed data in:
- `packages/database/supabase/seed.sql`

## Using Supabase

### Frontend (Direct Access)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign up
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
})

// Query data (RLS applies automatically)
const { data: airports } = await supabase
  .from('airports')
  .select('*')
  .eq('is_popular', true)

// Real-time subscription
supabase
  .channel('offers')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'offers',
  }, (payload) => console.log(payload))
  .subscribe()
```

### Backend (Service Role)

The API server uses the service role key to bypass RLS for admin operations.

## Production Deployment

1. Create a project at https://supabase.com
2. Link your project:
   ```bash
   cd packages/database
   supabase link --project-ref your-project-ref
   ```
3. Push migrations:
   ```bash
   npm run migrate:prod
   ```
4. Use production Supabase URL and keys in your deployment

## Useful Commands

```bash
# Start local Supabase
cd packages/database && npm run supabase:start

# Stop local Supabase
npm run supabase:stop

# Check status
npm run supabase:status

# Reset database (caution!)
npm run reset

# Generate TypeScript types
npm run types

# View logs
supabase logs --db

# Open Studio
open http://127.0.0.1:64323
```

## Documentation

- [Supabase Architecture](docs/SUPABASE-ARCHITECTURE.md)
- [Migration Guide](SUPABASE-MIGRATION.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Next Steps

1. ✅ Supabase setup complete
2. 🔄 Migrate API endpoints to use Supabase client (as needed)
3. 📋 Stage 2: Build Wheel MVP with Duffel integration
4. 📋 Stage 3: Laravel SEO pages
5. 📋 Stage 4: Price alerts with real-time

Happy coding! 🎉
