# Supabase Migration Guide

## What Changed

### 🗑️ Removed
- ❌ Prisma ORM and schema
- ❌ Custom JWT authentication
- ❌ Self-hosted PostgreSQL (from Docker Compose)
- ❌ Custom session management
- ❌ Password hashing utilities (handled by Supabase Auth)

### ✅ Added
- ✅ Supabase as backend platform
- ✅ Supabase Auth (GoTrue)
- ✅ Supabase Client (`@supabase/supabase-js`)
- ✅ Row Level Security (RLS) policies
- ✅ SQL migrations instead of Prisma
- ✅ Auto-generated TypeScript types from database
- ✅ Supabase local development environment

## New Architecture

```
Frontend (Next.js/Expo)
  ↓ (direct connection)
Supabase Cloud
  ├── PostgreSQL + RLS
  ├── Auth (GoTrue)
  ├── Storage
  ├── Realtime
  └── Edge Functions

Custom API (Express)
  ↓ (service role)
Supabase
  └── For complex business logic only
```

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase (Already Done)

The project is pre-configured with:
- `packages/database/supabase/migrations/` - SQL migrations
- `packages/database/supabase/config.toml` - Local config
- `packages/database/supabase/seed.sql` - Seed data

### 3. Start Local Supabase

```bash
cd packages/database
npm run supabase:start
```

This starts Docker containers for:
- PostgreSQL (port 54322)
- PostgREST API (port 54321)
- Auth server (port 54321)
- Studio UI (port 54323)
- Inbucket email (port 54324)

### 4. Get Credentials

After starting, you'll see:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
anon key: eyJh...
service_role key: eyJh...
```

### 5. Update Environment Variables

**packages/api/.env:**
```env
# Supabase (Local Development)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJh... (from supabase start output)
SUPABASE_SERVICE_KEY=eyJh... (from supabase start output)

# Remove these (no longer needed):
# DATABASE_URL
# JWT_SECRET
```

**packages/web/.env.local:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

### 6. Apply Migrations

Migrations are applied automatically when you run `supabase start`.

To manually push migrations:
```bash
npm run migrate:dev
```

### 7. Generate TypeScript Types

```bash
cd packages/database
npm run types
```

This generates `packages/shared/src/types/database.types.ts` from your schema.

### 8. View Database

Open Supabase Studio:
```
http://127.0.0.1:54323
```

## Using Supabase in Code

### Frontend (Direct Access)

```typescript
// packages/web/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@traveltomorrow/shared/types/database.types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
})

// Query airports (RLS applies)
const { data: airports } = await supabase
  .from('airports')
  .select('*')
  .eq('is_popular', true)

// Subscribe to real-time updates
const channel = supabase
  .channel('offers')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'offers',
  }, (payload) => console.log(payload))
  .subscribe()
```

### Backend (Service Role)

```typescript
// packages/api/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
)

// Server can do anything
await supabase
  .from('admin_actions')
  .insert({ user_id, action, entity_type, entity_id })
```

### Authentication Middleware

```typescript
// packages/api/src/middleware/auth.ts
import { supabase } from '../config/supabase'

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = user
  next()
}
```

## Production Deployment

### 1. Create Supabase Project

Visit https://supabase.com and create a project.

### 2. Link Project

```bash
cd packages/database
supabase link --project-ref your-project-ref
```

### 3. Push Migrations

```bash
npm run migrate:prod
```

### 4. Update Environment Variables

Use production Supabase URL and keys in your deployment platform.

## Migration Checklist

- [x] Prisma schema → SQL migrations
- [x] RLS policies created
- [x] Seed data in SQL
- [ ] Update API package.json (remove Prisma, add Supabase)
- [ ] Replace database config with Supabase client
- [ ] Update auth middleware for Supabase Auth
- [ ] Update auth routes to use Supabase Auth
- [ ] Remove custom JWT utilities
- [ ] Update airports routes
- [ ] Update Docker Compose (remove PostgreSQL)
- [ ] Update environment variable templates
- [ ] Test all endpoints
- [ ] Update documentation

## Benefits Summary

✅ **Simpler Auth** - No custom JWT implementation
✅ **Real-time** - Built-in WebSocket subscriptions
✅ **Security** - Row Level Security at database level
✅ **Type Safety** - Auto-generated TypeScript types
✅ **Faster Development** - Auto-generated REST API
✅ **Better DX** - Supabase Studio for database management
✅ **Scalable** - Managed infrastructure
✅ **Cost Effective** - Generous free tier

## Next Steps

1. Complete API migration (in progress)
2. Update Next.js web app to use Supabase client
3. Test authentication flow
4. Test RLS policies
5. Proceed with Stage 2 (Wheel MVP)
