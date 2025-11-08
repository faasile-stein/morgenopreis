# TravelTomorrow - Supabase Architecture

## Overview

TravelTomorrow uses **Supabase** as the primary backend infrastructure, providing:
- PostgreSQL database (managed, with real-time subscriptions)
- Authentication & authorization (with RLS)
- Auto-generated REST API
- Storage for media files
- Edge functions for serverless logic

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js Web App          │         Expo Mobile App         │
│  - Supabase Client        │        - Supabase Client        │
│  - Direct DB access       │        - Direct DB access       │
│  - Real-time subs         │        - Real-time subs         │
└─────────────────┬───────────────────────────┬───────────────┘
                  │                           │
                  ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   Auth       │  │   Storage    │      │
│  │  + RLS       │  │   (GoTrue)   │  │   (S3-like)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Auto REST   │  │  Realtime    │  │ Edge Funcs   │      │
│  │  API         │  │  (WebSocket) │  │  (Deno)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Custom API Server (Express)                     │
├─────────────────────────────────────────────────────────────┤
│  Business Logic:                                             │
│  - Duffel flight integration                                 │
│  - Price scoring algorithms                                  │
│  - Wheel spin logic                                          │
│  - Complex booking orchestration                             │
│  - Affiliate link generation                                 │
│  - Background jobs (price alerts)                            │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Laravel CMS (SEO)                         │
├─────────────────────────────────────────────────────────────┤
│  - Destination editorial content                             │
│  - Bank holiday pages                                        │
│  - Blog posts & guides                                       │
│  - JSON-LD / Schema.org markup                               │
│  - Connects to Supabase via PostgreSQL driver               │
└─────────────────────────────────────────────────────────────┘
```

## Why Supabase?

### Advantages
1. **Built-in Auth** - No need to build JWT system, session management
2. **Row Level Security (RLS)** - Database-level security policies
3. **Real-time** - Live price updates, booking status changes
4. **Auto-generated API** - REST & GraphQL APIs automatically from schema
5. **Type-safe** - Generated TypeScript types from database
6. **Storage** - Built-in file storage for destination images
7. **Edge Functions** - Serverless functions close to users
8. **Managed DB** - No PostgreSQL maintenance
9. **Direct Client Access** - Frontend can query DB directly (with RLS)
10. **Cost-effective** - Free tier generous, scales well

### What We Keep Custom
- **Express API Server** - For complex business logic:
  - Duffel API integration
  - Price scoring algorithms
  - Wheel spin randomization
  - Booking orchestration
  - Background jobs (cron)

- **Laravel CMS** - For SEO content:
  - Editorial destination pages
  - Bank holiday content
  - Blog posts
  - Rich media management
  - Filament admin panel

## Database Access Patterns

### Direct Supabase Access (from Frontend)
```typescript
// Next.js / Mobile App
import { createClient } from '@supabase/supabase-js'

// User can directly query airports
const { data: airports } = await supabase
  .from('airports')
  .select('*')
  .eq('country_code', 'BE')

// RLS ensures they only see/modify allowed data
```

### Custom API for Business Logic
```typescript
// Complex operations via our API
POST /api/wheel/spin
  → Custom logic to select destinations
  → Calls Duffel for offers
  → Stores in Supabase
  → Returns results

POST /api/bookings
  → Orchestrates Duffel booking
  → Handles payment
  → Updates Supabase
```

## Authentication Flow

### Using Supabase Auth

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
})

// Get session
const { data: { session } } = await supabase.auth.getSession()

// Use session token for custom API
fetch('/api/wheel/spin', {
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
})
```

### Row Level Security (RLS) Policies

```sql
-- Users can only see their own bookings
CREATE POLICY "Users view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own bookings
CREATE POLICY "Users create own bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can see all bookings
CREATE POLICY "Admins view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
```

## Real-time Subscriptions

```typescript
// Listen for price updates on a destination
const channel = supabase
  .channel('destination-prices')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'offers',
      filter: `destination_id=eq.${destinationId}`,
    },
    (payload) => {
      console.log('Price updated!', payload.new)
    }
  )
  .subscribe()
```

## Storage for Media

```typescript
// Upload destination image
const { data, error } = await supabase.storage
  .from('destination-images')
  .upload(`${destinationId}/hero.jpg`, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('destination-images')
  .getPublicUrl(`${destinationId}/hero.jpg`)
```

## Edge Functions (Optional)

```typescript
// supabase/functions/send-price-alert/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { userId, destinationId, price } = await req.json()

  // Send email via SendGrid
  // Log in database

  return new Response(JSON.stringify({ success: true }))
})
```

## Environment Setup

### Supabase Project
1. Create project at https://supabase.com
2. Get credentials from Settings → API:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (public, for client)
   - `SUPABASE_SERVICE_KEY` (private, for server)

### Local Development
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize
supabase init

# Start local Supabase (Docker)
supabase start

# Run migrations
supabase db push
```

## Deployment Architecture

### Production
- **Supabase Cloud** - Managed database, auth, storage
- **Vercel** - Next.js web app deployment
- **Expo EAS** - Mobile app hosting
- **Custom API** - Deploy to Railway/Render/AWS
- **Laravel** - Deploy to Laravel Forge/Vapor/AWS

### Development
- **Local Supabase** - Docker containers (DB, Auth, Storage)
- **Local Next.js** - `npm run dev`
- **Local API** - Express on port 3001
- **Local Laravel** - `php artisan serve` on port 8000

## Migration from Current Setup

### What Changes
- ❌ Remove Prisma
- ❌ Remove custom JWT auth
- ❌ Remove self-hosted PostgreSQL from Docker
- ✅ Add Supabase client
- ✅ Add Supabase Auth
- ✅ Add Supabase SQL migrations
- ✅ Keep Redis for API caching
- ✅ Keep custom API for business logic
- ✅ Use Laravel for SEO content management

### Migration Steps
1. Convert Prisma schema → Supabase SQL migrations
2. Replace `@prisma/client` with `@supabase/supabase-js`
3. Update auth to use Supabase Auth
4. Update API middleware
5. Generate TypeScript types from Supabase
6. Update environment variables
7. Test all endpoints

## Security Best Practices

1. **RLS Policies** - Always enable RLS on tables
2. **Service Key** - Only use in secure server environments
3. **Anon Key** - Safe to expose in client apps
4. **API Validation** - Validate in custom API even with RLS
5. **Rate Limiting** - Implement on custom API endpoints
6. **Audit Logging** - Log sensitive operations

## Cost Considerations

### Free Tier (Generous)
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users
- 500,000 edge function invocations

### Pro Tier ($25/month)
- 8 GB database
- 100 GB storage
- 250 GB bandwidth
- 100,000 monthly active users
- 2M edge function invocations

Perfect for MVP and early growth!
