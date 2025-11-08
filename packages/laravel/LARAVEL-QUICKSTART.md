# Laravel SEO Website - Quick Start

This Laravel application provides SEO-optimized pages for TravelTomorrow with JSON-LD structured data, sitemaps, and server-side rendering.

## Features Implemented

### ✅ Controllers
- **HomeController** - Homepage with featured destinations
- **DestinationController** - Destination pages with price statistics
- **SitemapController** - XML sitemaps for SEO
- **BankHolidayController** - Country-specific holiday pages (stub)

### ✅ Routes (web.php)
- `/` - Homepage
- `/destinations` - All destinations listing
- `/destinations/{slug}` - Single destination page
- `/weekend-trips` - Weekend trips category
- `/city-breaks` - City breaks category
- `/romantic-getaways` - Romantic getaways category
- `/sitemap.xml` - Main sitemap index
- `/sitemap-destinations.xml` - Destinations sitemap

### ✅ Views
- **layouts/app.blade.php** - Main layout with SEO meta tags
- **destinations/show.blade.php** - Destination page with JSON-LD
- **sitemap/*.blade.php** - XML sitemap templates

### ✅ SEO Features
- **JSON-LD Structured Data** - TouristDestination, BreadcrumbList schemas
- **Meta Tags** - Title, description, Open Graph, Twitter Cards
- **Canonical URLs** - Proper canonicalization
- **Sitemaps** - XML sitemaps for search engines
- **Server-Side Rendering** - Fast, crawlable pages

### ✅ Database Integration
- Connects to Supabase PostgreSQL (shared with Express API)
- Reads from existing tables: destinations, airports, offers, price_history
- No migrations needed (uses existing schema)

## Installation Steps

### 1. Install Laravel

```bash
cd packages/laravel
composer create-project laravel/laravel . "11.*"
```

### 2. Copy Application Files

The following files have been created:
- `routes/web.php`
- `app/Http/Controllers/*.php`
- `resources/views/**/*.blade.php`
- `.env.example`
- `composer.json`

### 3. Configure Environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=54322  # Supabase local port
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=postgres

APP_URL=http://localhost:8000
API_URL=http://localhost:3001
```

### 4. Install Dependencies

```bash
composer install
npm install
npm run build
```

### 5. Start Development Server

```bash
php artisan serve
```

Visit: http://localhost:8000

## Usage

### Viewing Destinations

Navigate to http://localhost:8000/destinations/barcelona (or any destination slug from your database)

### Checking SEO

1. **View Page Source** - See JSON-LD structured data
2. **Test in Google Rich Results** - https://search.google.com/test/rich-results
3. **Check Sitemap** - http://localhost:8000/sitemap.xml

### Adding New Destinations (via API)

Use the Admin API to add destinations:

```bash
curl -X POST http://localhost:3001/api/admin/destinations \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Barcelona",
    "city": "Barcelona",
    "country": "Spain",
    "primaryAirportIata": "BCN",
    "description": "Vibrant city with beaches and Gaudí architecture",
    "isFeatured": true,
    "isPublished": true,
    "estimatedPriceEur": 180,
    "tags": ["weekend", "city-break", "romantic"]
  }'
```

## JSON-LD Schema Examples

### TouristDestination

Every destination page includes:

```json
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "Barcelona",
  "description": "Vibrant city...",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "41.2974",
    "longitude": "2.0833"
  },
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "EUR",
    "lowPrice": "120",
    "highPrice": "250"
  }
}
```

### BreadcrumbList

For navigation hierarchy:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [...]
}
```

## Customization

### Adding Custom Pages

1. Create controller: `php artisan make:controller YourController`
2. Add route in `routes/web.php`
3. Create view in `resources/views/`

### Styling

Currently using Tailwind CSS via CDN. For production:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Then build assets: `npm run build`

## Production Deployment

### Laravel Forge

1. Connect GitHub repository
2. Set environment variables
3. Deploy script runs automatically

### Manual Deployment

```bash
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Environment

```env
APP_ENV=production
APP_DEBUG=false
DB_HOST=db.your-supabase-project.supabase.co
DB_PORT=5432
CACHE_DRIVER=redis
SESSION_DRIVER=redis
```

## Integration with Main App

### API Communication

Laravel reads from Supabase, same as Express API.
For real-time data sync, both connect to same database.

### User Authentication

For admin features, Laravel can:
- Use Laravel's built-in auth
- Validate Supabase JWT tokens
- Integrate with Express API

### Booking Flow

1. User discovers destination on Laravel site
2. Clicks "Book Now" → Redirects to main app (Next.js)
3. Main app handles wheel spin and booking via Express API

## Monitoring

### Performance

- Enable Laravel Telescope for debugging
- Use Laravel Horizon for queue monitoring
- Implement caching for frequently accessed data

### SEO

- Google Search Console - Submit sitemaps
- Monitor Core Web Vitals
- Track organic traffic in GA4

## Next Steps

- [ ] Install Filament for admin panel
- [ ] Add multi-language support
- [ ] Implement caching strategies
- [ ] Create blog functionality
- [ ] Add more JSON-LD schemas (Hotel, Event)
