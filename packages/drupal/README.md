# TravelTomorrow Drupal CMS

This package contains the Drupal 10 CMS for TravelTomorrow, providing SEO-optimized content pages for destinations.

## Setup

The Drupal instance runs in Docker and connects to the PostgreSQL database.

### Installation

1. Build the Docker image:
```bash
docker-compose build drupal
```

2. Start the container:
```bash
docker-compose up drupal
```

3. Access Drupal at http://localhost:8080

## Planned Content Types

- **Destination** - City destination pages with rich SEO metadata
- **Bank Holiday Page** - Country-specific holiday travel pages
- **Itinerary** - Suggested travel itineraries

## Modules

- **Admin Toolbar** - Enhanced admin interface
- **Metatag** - SEO meta tags
- **Pathauto** - Automatic URL aliases
- **Schema Metatag** - JSON-LD structured data
- **Simple Sitemap** - XML sitemaps
- **JSON:API** - REST API for headless integration

## Development

Full Drupal configuration will be implemented in Stage 3 (SEO & Editorial).
