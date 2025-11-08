# TravelTomorrow Laravel CMS

Laravel-based CMS for SEO-focused content management including destination pages, bank holiday pages, and blog content.

## Features

- **Editorial Content Management** - Rich destination pages with itineraries
- **SEO Optimization** - JSON-LD structured data (Schema.org)
- **Bank Holiday Pages** - Country-specific content for holidays
- **Blog & Guides** - Travel tips and destination guides
- **Filament Admin Panel** - Modern admin interface
- **Supabase Integration** - Connects to shared Supabase database

## Tech Stack

- **Laravel 11.x** - Modern PHP framework
- **Filament 3.x** - Admin panel and form builder
- **PostgreSQL** - Via Supabase connection
- **Tailwind CSS** - Utility-first styling
- **Blade Templates** - Server-side rendering for SEO

## Setup

### Prerequisites

- PHP 8.2 or higher
- Composer 2.x
- Supabase project (local or cloud)

### Installation

1. Install dependencies:
```bash
cd packages/laravel
composer install
```

2. Configure environment:
```bash
cp .env.example .env
php artisan key:generate
```

3. Configure Supabase connection in `.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=your-supabase-db-host
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=your-db-password
```

4. Run migrations (uses Supabase schema):
```bash
php artisan migrate
```

5. Create admin user:
```bash
php artisan make:filament-user
```

6. Start development server:
```bash
php artisan serve
```

Visit:
- **Frontend**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

## Architecture

### Database Connection

Laravel connects directly to the Supabase PostgreSQL database:
- Reads from existing `destinations`, `airports`, `offers` tables
- Can write editorial content and metadata
- Respects database constraints and relationships

### Content Types

#### Destinations
- City name, country, description
- Hero image and gallery
- Itinerary (structured JSON)
- SEO metadata (title, description, keywords)
- JSON-LD markup for Schema.org

#### Bank Holiday Pages
- Country-specific holidays
- Dynamic deal listings
- Editorial content and recommendations
- Seasonal travel tips

#### Blog Posts
- Travel guides and tips
- Destination spotlights
- How-to articles
- SEO-optimized content

### Admin Panel (Filament)

Filament provides:
- Resource management for destinations, blog posts, etc.
- Rich text editor with media library
- Image uploads and management
- User roles and permissions
- Activity logging

## Development

### Running Locally

```bash
php artisan serve
```

### Running Tests

```bash
php artisan test
```

### Code Quality

```bash
# PHP CS Fixer
./vendor/bin/pint

# PHPStan
./vendor/bin/phpstan analyse
```

## SEO Features

### JSON-LD Structured Data

Each destination page includes Schema.org markup:

```php
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "Amsterdam",
  "description": "...",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "52.3676",
    "longitude": "4.9041"
  }
}
```

### Sitemap Generation

```bash
php artisan sitemap:generate
```

### Meta Tags

All pages include:
- Title tags (optimized length)
- Meta descriptions
- Open Graph tags
- Twitter Cards
- Canonical URLs
- hreflang tags (for multi-language)

## Deployment

### Production Build

```bash
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Deployment Options

- **Laravel Forge** - Recommended for easy deployment
- **Laravel Vapor** - Serverless deployment on AWS
- **Traditional VPS** - Nginx + PHP-FPM

### Environment Variables

See `.env.example` for all required variables.

Key production settings:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `DB_*` - Supabase production connection
- `CACHE_DRIVER=redis`
- `SESSION_DRIVER=redis`

## Integration with Main App

### API Communication

Laravel can communicate with the Express API for:
- User data synchronization
- Booking information
- Dynamic offer displays

### Shared Database

Both Laravel and the Express API connect to the same Supabase database:
- Laravel: Read/write editorial content
- Express API: Handle bookings, offers, user management

### Authentication

For admin-only features, Laravel uses its own authentication.
For user-facing features, it can validate Supabase JWT tokens.

## Future Enhancements

- [ ] Multi-language support (i18n)
- [ ] Advanced caching strategies
- [ ] A/B testing for content
- [ ] Analytics integration
- [ ] CDN integration for images

## Documentation

- [Laravel Documentation](https://laravel.com/docs)
- [Filament Documentation](https://filamentphp.com/docs)
- [Supabase PHP Client](https://github.com/supabase-community/supabase-php)
