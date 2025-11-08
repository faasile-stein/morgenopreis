# Laravel CMS Setup Guide

This guide will help you set up the Laravel CMS for TravelTomorrow.

## Quick Setup (Coming Soon)

The Laravel application will be fully scaffolded in a future commit. For now, this directory structure is prepared.

## Manual Setup

To create a fresh Laravel installation with all required packages:

### 1. Install Laravel

```bash
cd packages/laravel
composer create-project laravel/laravel . "11.*"
```

### 2. Install Required Packages

```bash
# Filament Admin Panel
composer require filament/filament:"^3.0" -W

# Code Quality
composer require laravel/pint --dev
composer require larastan/larastan --dev

# Additional packages
composer require spatie/laravel-sitemap
composer require spatie/laravel-sluggable
composer require spatie/laravel-medialibrary
```

### 3. Configure Filament

```bash
php artisan filament:install --panels
```

### 4. Set Up Environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` with your Supabase credentials:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=54322
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

### 5. Create Models & Resources

We'll create Filament resources for:

- **Destinations** - Editorial destination pages
- **BankHolidays** - Country-specific holiday pages
- **BlogPosts** - Travel guides and articles

Example commands:
```bash
php artisan make:filament-resource Destination --generate
php artisan make:filament-resource BankHoliday --generate
php artisan make:filament-resource BlogPost --generate
```

### 6. Configure JSON-LD

Create views with Schema.org structured data for SEO.

Example blade template snippet:
```blade
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  "name": "{{ $destination->name }}",
  "description": "{{ $destination->description }}",
  "image": "{{ $destination->hero_image }}",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "{{ $destination->latitude }}",
    "longitude": "{{ $destination->longitude }}"
  }
}
</script>
```

### 7. Routes

Define SEO-friendly routes:
```php
// routes/web.php
Route::get('/', [HomeController::class, 'index']);
Route::get('/destinations/{slug}', [DestinationController::class, 'show']);
Route::get('/bank-holidays/{country}/{slug}', [BankHolidayController::class, 'show']);
Route::get('/blog/{slug}', [BlogController::class, 'show']);
```

## Database Schema Notes

### Using Existing Supabase Tables

The Laravel app connects to the same Supabase database as the Express API.

**Existing tables** (from Supabase migrations):
- `destinations` - Core destination data
- `airports` - Airport information
- `offers` - Flight offers and pricing
- `users` - User accounts

**Laravel-specific tables** (to be created):
- `bank_holidays` - Holiday content and metadata
- `blog_posts` - Blog articles
- `destination_content` - Extended editorial content (links to destinations)
- `media` - Media library (Spatie)

### Migration Strategy

1. Don't modify existing tables created by Supabase migrations
2. Create new tables for Laravel-specific features
3. Use foreign keys to link to existing tables

Example migration:
```php
Schema::create('destination_content', function (Blueprint $table) {
    $table->id();
    $table->uuid('destination_id');
    $table->foreign('destination_id')
          ->references('id')
          ->on('destinations')
          ->onDelete('cascade');
    $table->text('editorial_content');
    $table->json('itinerary')->nullable();
    $table->json('seo_meta')->nullable();
    $table->timestamps();
});
```

## Development Workflow

### 1. Start Services

```bash
# Terminal 1: Start Supabase
cd packages/database
npm run supabase:start

# Terminal 2: Start Laravel
cd packages/laravel
php artisan serve

# Terminal 3: Start Express API (if needed)
cd packages/api
npm run dev
```

### 2. Access Points

- **Laravel Frontend**: http://localhost:8000
- **Filament Admin**: http://localhost:8000/admin
- **Express API**: http://localhost:3001
- **Supabase Studio**: http://localhost:54323

### 3. Create Admin User

```bash
php artisan make:filament-user
# Enter email and password when prompted
```

## Testing

### Feature Tests

```bash
php artisan test
```

### Browser Tests (Laravel Dusk)

```bash
composer require laravel/dusk --dev
php artisan dusk:install
php artisan dusk
```

## Deployment

See `README.md` for deployment instructions.

## Next Steps

1. ✅ Package structure created
2. ⏳ Install Laravel and dependencies
3. ⏳ Create Filament resources
4. ⏳ Build destination page templates
5. ⏳ Implement JSON-LD markup
6. ⏳ Configure sitemap generation
7. ⏳ Deploy to production
