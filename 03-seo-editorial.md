# Stage 3: SEO & Editorial Pages (Drupal)

## Overview
Build SEO-optimized editorial content system using Drupal with JSON-LD structured data for destination pages, bank holiday pages, and dynamic deal listings.

## Objectives
- Configure Drupal content types for destinations and pages
- Implement JSON-LD / Schema.org markup
- Build sitemap generation
- Create destination landing pages
- Implement bank holiday pages
- Set up URL structure and canonical URLs

---

## 1. Drupal Content Types

### Destination Content Type

**Install via Drush commands:**
```bash
# packages/drupal/scripts/create-content-types.sh

#!/bin/bash

# Enable required modules
drush en -y \
  pathauto \
  metatag \
  schema_metatag \
  jsonapi_extras \
  simple_sitemap \
  media \
  media_library \
  paragraphs \
  entity_reference_revisions

# Create Destination content type
drush php-eval "
use Drupal\node\Entity\NodeType;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;

// Create content type
\$node_type = NodeType::create([
  'type' => 'destination',
  'name' => 'Destination',
  'description' => 'Travel destination pages with itineraries',
]);
\$node_type->save();

// Add fields
\$fields = [
  [
    'field_name' => 'field_city',
    'label' => 'City',
    'type' => 'string',
  ],
  [
    'field_name' => 'field_country',
    'label' => 'Country',
    'type' => 'string',
  ],
  [
    'field_name' => 'field_airport_code',
    'label' => 'Airport Code',
    'type' => 'string',
  ],
  [
    'field_name' => 'field_short_description',
    'label' => 'Short Description',
    'type' => 'string_long',
  ],
  [
    'field_name' => 'field_long_description',
    'label' => 'Long Description',
    'type' => 'text_long',
  ],
  [
    'field_name' => 'field_hero_image',
    'label' => 'Hero Image',
    'type' => 'image',
  ],
  [
    'field_name' => 'field_gallery',
    'label' => 'Gallery',
    'type' => 'image',
    'cardinality' => -1,
  ],
  [
    'field_name' => 'field_trip_types',
    'label' => 'Trip Types',
    'type' => 'list_string',
    'cardinality' => -1,
    'settings' => [
      'allowed_values' => [
        'romantic' => 'Romantic',
        'city-break' => 'City Break',
        'outdoors' => 'Outdoors',
        'beach' => 'Beach',
        'culture' => 'Culture',
        'food' => 'Food & Wine',
      ],
    ],
  ],
  [
    'field_name' => 'field_itinerary',
    'label' => 'Itinerary',
    'type' => 'entity_reference_revisions',
    'target_type' => 'paragraph',
    'cardinality' => -1,
  ],
  [
    'field_name' => 'field_base_price',
    'label' => 'Base Price (EUR)',
    'type' => 'integer',
  ],
  [
    'field_name' => 'field_is_featured',
    'label' => 'Featured',
    'type' => 'boolean',
  ],
];

foreach (\$fields as \$field_data) {
  // Create field storage
  \$field_storage = FieldStorageConfig::create([
    'field_name' => \$field_data['field_name'],
    'entity_type' => 'node',
    'type' => \$field_data['type'],
    'cardinality' => \$field_data['cardinality'] ?? 1,
    'settings' => \$field_data['settings'] ?? [],
  ]);
  \$field_storage->save();

  // Create field instance
  \$field = FieldConfig::create([
    'field_storage' => \$field_storage,
    'bundle' => 'destination',
    'label' => \$field_data['label'],
  ]);
  \$field->save();
}

echo 'Destination content type created\n';
"

# Create Bank Holiday Page content type
drush php-eval "
use Drupal\node\Entity\NodeType;

\$node_type = NodeType::create([
  'type' => 'bank_holiday_page',
  'name' => 'Bank Holiday Page',
  'description' => 'Special pages for bank holidays with destination deals',
]);
\$node_type->save();
"

echo "Content types created successfully"
```

### Itinerary Paragraph Type

```bash
# Create paragraph type for itinerary items
drush php-eval "
use Drupal\paragraphs\Entity\ParagraphsType;

\$paragraph_type = ParagraphsType::create([
  'id' => 'itinerary_item',
  'label' => 'Itinerary Item',
]);
\$paragraph_type->save();

// Add fields to paragraph
\$fields = [
  ['field_name' => 'field_time', 'label' => 'Time', 'type' => 'string'],
  ['field_name' => 'field_title', 'label' => 'Title', 'type' => 'string'],
  ['field_name' => 'field_description', 'label' => 'Description', 'type' => 'text_long'],
  ['field_name' => 'field_location', 'label' => 'Location Name', 'type' => 'string'],
  ['field_name' => 'field_location_url', 'label' => 'Location URL', 'type' => 'link'],
  ['field_name' => 'field_image', 'label' => 'Image', 'type' => 'image'],
];

foreach (\$fields as \$field_data) {
  \$field_storage = FieldStorageConfig::create([
    'field_name' => \$field_data['field_name'],
    'entity_type' => 'paragraph',
    'type' => \$field_data['type'],
  ]);
  \$field_storage->save();

  \$field = FieldConfig::create([
    'field_storage' => \$field_storage,
    'bundle' => 'itinerary_item',
    'label' => \$field_data['label'],
  ]);
  \$field->save();
}
"
```

---

## 2. JSON-LD Schema Implementation

### Custom Module for JSON-LD

**packages/drupal/modules/custom/traveltomorrow_schema/traveltomorrow_schema.module:**
```php
<?php

use Drupal\node\Entity\Node;
use Drupal\Core\Entity\EntityInterface;

/**
 * Implements hook_page_attachments_alter().
 */
function traveltomorrow_schema_page_attachments_alter(array &$attachments) {
  $route_match = \Drupal::routeMatch();

  if ($route_match->getRouteName() === 'entity.node.canonical') {
    $node = $route_match->getParameter('node');

    if ($node instanceof Node && $node->bundle() === 'destination') {
      $schema = _traveltomorrow_generate_destination_schema($node);

      $attachments['#attached']['html_head'][] = [
        [
          '#type' => 'html_tag',
          '#tag' => 'script',
          '#attributes' => ['type' => 'application/ld+json'],
          '#value' => json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
        ],
        'traveltomorrow_destination_schema',
      ];
    }
  }
}

/**
 * Generate JSON-LD schema for destination page.
 */
function _traveltomorrow_generate_destination_schema(Node $node) {
  $city = $node->get('field_city')->value;
  $country = $node->get('field_country')->value;
  $description = $node->get('field_short_description')->value;
  $hero_image = $node->get('field_hero_image')->entity;

  $schema = [
    '@context' => 'https://schema.org',
    '@type' => 'TouristDestination',
    'name' => $city . ', ' . $country,
    'description' => $description,
  ];

  if ($hero_image) {
    $image_uri = $hero_image->getFileUri();
    $image_url = \Drupal::service('file_url_generator')->generateAbsoluteString($image_uri);
    $schema['image'] = $image_url;
  }

  // Add itinerary as TouristTrip
  if ($node->hasField('field_itinerary') && !$node->get('field_itinerary')->isEmpty()) {
    $itinerary_items = [];

    foreach ($node->get('field_itinerary') as $item) {
      $paragraph = $item->entity;

      $itinerary_items[] = [
        '@type' => 'TouristAttraction',
        'name' => $paragraph->get('field_title')->value,
        'description' => $paragraph->get('field_description')->value,
        'url' => $paragraph->get('field_location_url')->uri ?? null,
      ];
    }

    if (!empty($itinerary_items)) {
      $schema['touristAttraction'] = $itinerary_items;
    }
  }

  // Add offers (integrate with API)
  $base_price = $node->get('field_base_price')->value;
  if ($base_price) {
    $schema['offers'] = [
      '@type' => 'Offer',
      'priceCurrency' => 'EUR',
      'price' => $base_price / 100,
      'availability' => 'https://schema.org/InStock',
      'url' => \Drupal::request()->getSchemeAndHttpHost() . $node->toUrl()->toString(),
    ];
  }

  return $schema;
}

/**
 * Generate itinerary schema.
 */
function _traveltomorrow_generate_itinerary_schema(Node $node) {
  $itinerary_paragraphs = $node->get('field_itinerary')->referencedEntities();

  $itinerary = [
    '@context' => 'https://schema.org',
    '@type' => 'TouristTrip',
    'name' => $node->getTitle() . ' Itinerary',
    'itinerary' => [],
  ];

  foreach ($itinerary_paragraphs as $paragraph) {
    $item = [
      '@type' => 'TouristAttraction',
      'name' => $paragraph->get('field_title')->value,
      'description' => $paragraph->get('field_description')->value,
    ];

    if (!$paragraph->get('field_location_url')->isEmpty()) {
      $item['url'] = $paragraph->get('field_location_url')->uri;
    }

    $itinerary['itinerary'][] = $item;
  }

  return $itinerary;
}
```

---

## 3. API Integration with Drupal

### Sync Destinations from API to Drupal

**packages/api/src/services/drupal-sync.service.ts:**
```typescript
import axios from 'axios';
import { prisma } from '../config/database';
import { logger } from '@traveltomorrow/shared/logger';

const DRUPAL_BASE_URL = process.env.DRUPAL_URL || 'http://localhost:8080';
const DRUPAL_API_USER = process.env.DRUPAL_API_USER;
const DRUPAL_API_PASS = process.env.DRUPAL_API_PASS;

export class DrupalSyncService {
  private drupalClient;

  constructor() {
    this.drupalClient = axios.create({
      baseURL: DRUPAL_BASE_URL,
      auth: {
        username: DRUPAL_API_USER!,
        password: DRUPAL_API_PASS!,
      },
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
    });
  }

  /**
   * Sync destination to Drupal
   */
  async syncDestination(destinationId: string) {
    try {
      const destination = await prisma.destination.findUnique({
        where: { id: destinationId },
        include: { airport: true },
      });

      if (!destination) {
        throw new Error('Destination not found');
      }

      // Check if already exists in Drupal
      const existing = await this.findDrupalNode(destination.slug);

      const nodeData = {
        data: {
          type: 'node--destination',
          attributes: {
            title: destination.title,
            field_city: destination.city,
            field_country: destination.country,
            field_airport_code: destination.airport.iataCode,
            field_short_description: destination.shortDescription,
            field_long_description: destination.longDescription,
            field_base_price: destination.basePriceEur,
            field_is_featured: destination.isFeatured,
            status: destination.isPublished,
          },
        },
      };

      if (existing) {
        // Update existing node
        await this.drupalClient.patch(
          `/jsonapi/node/destination/${existing.id}`,
          { data: { ...nodeData.data, id: existing.id } }
        );
        logger.info('Updated Drupal node', { slug: destination.slug });
      } else {
        // Create new node
        await this.drupalClient.post('/jsonapi/node/destination', nodeData);
        logger.info('Created Drupal node', { slug: destination.slug });
      }
    } catch (error) {
      logger.error('Drupal sync error:', error);
      throw error;
    }
  }

  /**
   * Find Drupal node by slug
   */
  private async findDrupalNode(slug: string) {
    try {
      const response = await this.drupalClient.get('/jsonapi/node/destination', {
        params: {
          'filter[path]': `/destinations/${slug}`,
        },
      });

      return response.data.data[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sync all published destinations
   */
  async syncAllDestinations() {
    const destinations = await prisma.destination.findMany({
      where: { isPublished: true },
    });

    logger.info(`Syncing ${destinations.length} destinations to Drupal`);

    for (const dest of destinations) {
      await this.syncDestination(dest.id);
    }

    logger.info('Drupal sync complete');
  }
}

export const drupalSyncService = new DrupalSyncService();
```

---

## 4. Pathauto Configuration

**Configure URL patterns in Drupal:**
```php
// Install pathauto patterns via config
drush config:set pathauto.pattern.destination_pattern \
  pattern '/destinations/[node:field_city:clean]' \
  type 'canonical_entities:node' \
  bundles 'destination'

drush config:set pathauto.pattern.bank_holiday_pattern \
  pattern '/holidays/[node:field_country_code]/[node:field_year]/[node:title:clean]' \
  type 'canonical_entities:node' \
  bundles 'bank_holiday_page'
```

---

## 5. Sitemap Generation

### Simple Sitemap Configuration

```bash
# Enable and configure simple_sitemap
drush en -y simple_sitemap

# Configure sitemap settings
drush php-eval "
\$config = \Drupal::configFactory()->getEditable('simple_sitemap.settings');
\$config->set('max_links', 5000);
\$config->set('cron_generate', TRUE);
\$config->set('base_url', 'https://www.traveltomorrow.be');
\$config->save();

// Enable sitemap for destination content type
\$bundle_settings = [
  'index' => TRUE,
  'priority' => '0.8',
  'changefreq' => 'weekly',
];

\Drupal::service('simple_sitemap.entity_manager')
  ->setBundleSettings('node', 'destination', $bundle_settings);

echo 'Sitemap configured\n';
"

# Generate sitemap
drush simple-sitemap:generate
```

### Custom Sitemap for Deals

**packages/drupal/modules/custom/traveltomorrow_sitemap/src/Controller/DealsSitemapController.php:**
```php
<?php

namespace Drupal\traveltomorrow_sitemap\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Response;

class DealsSitemapController extends ControllerBase {

  public function generate() {
    // Fetch active deals from API
    $api_url = getenv('API_URL') . '/destinations/published';
    $response = file_get_contents($api_url);
    $destinations = json_decode($response, TRUE);

    $sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
    $sitemap .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    foreach ($destinations as $dest) {
      $sitemap .= '<url>';
      $sitemap .= '<loc>https://www.traveltomorrow.be/destinations/' . $dest['slug'] . '</loc>';
      $sitemap .= '<lastmod>' . date('Y-m-d', strtotime($dest['updatedAt'])) . '</lastmod>';
      $sitemap .= '<changefreq>weekly</changefreq>';
      $sitemap .= '<priority>0.8</priority>';
      $sitemap .= '</url>';
    }

    $sitemap .= '</urlset>';

    $response = new Response($sitemap);
    $response->headers->set('Content-Type', 'application/xml');

    return $response;
  }
}
```

---

## 6. Metatag Configuration

**Configure metatag module:**
```bash
drush en -y metatag metatag_open_graph metatag_twitter_cards

# Set default metatags for destination content type
drush php-eval "
\$config = \Drupal::configFactory()->getEditable('metatag.metatag_defaults.node__destination');
\$config->set('tags', [
  'title' => '[node:title] | TravelTomorrow',
  'description' => '[node:field_short_description]',
  'og_site_name' => 'TravelTomorrow',
  'og_type' => 'website',
  'og_url' => '[node:url]',
  'og_title' => '[node:title]',
  'og_description' => '[node:field_short_description]',
  'og_image' => '[node:field_hero_image:entity:url]',
  'twitter_cards_type' => 'summary_large_image',
  'twitter_cards_title' => '[node:title]',
  'twitter_cards_description' => '[node:field_short_description]',
  'twitter_cards_image' => '[node:field_hero_image:entity:url]',
]);
\$config->save();
"
```

---

## 7. Destination Template (Twig)

**packages/drupal/themes/custom/traveltomorrow/templates/node--destination.html.twig:**
```twig
{#
/**
 * @file
 * Theme override for destination nodes.
 */
#}

<article{{ attributes.addClass('destination-page') }}>

  {# Hero Section #}
  <div class="destination-hero">
    {% if content.field_hero_image %}
      <div class="hero-image">
        {{ content.field_hero_image }}
      </div>
    {% endif %}

    <div class="hero-content">
      <h1 class="destination-title">{{ label }}</h1>

      {% if content.field_short_description %}
        <p class="destination-intro">
          {{ content.field_short_description }}
        </p>
      {% endif %}

      {% if content.field_base_price %}
        <div class="destination-price">
          <span class="price-label">From</span>
          <span class="price-amount">€{{ content.field_base_price.0['#markup'] / 100 }}</span>
        </div>
      {% endif %}

      <a href="#book-now" class="btn btn-primary btn-lg">
        Book Your Trip
      </a>
    </div>
  </div>

  {# Description #}
  <section class="destination-description">
    <div class="container">
      {{ content.field_long_description }}
    </div>
  </section>

  {# Itinerary #}
  {% if content.field_itinerary %}
    <section class="destination-itinerary">
      <div class="container">
        <h2>Perfect Weekend Itinerary</h2>
        <div class="itinerary-timeline">
          {{ content.field_itinerary }}
        </div>
      </div>
    </section>
  {% endif %}

  {# Gallery #}
  {% if content.field_gallery %}
    <section class="destination-gallery">
      <div class="container">
        <h2>Gallery</h2>
        <div class="gallery-grid">
          {{ content.field_gallery }}
        </div>
      </div>
    </section>
  {% endif %}

  {# Current Deals (via API) #}
  <section class="destination-deals" id="book-now">
    <div class="container">
      <h2>Current Deals</h2>
      <div id="deals-container" data-destination-id="{{ node.uuid.value }}">
        {# Populated by JavaScript from API #}
        <div class="loading">Loading available flights...</div>
      </div>
    </div>
  </section>

  {# Accommodation Links #}
  <section class="destination-accommodation">
    <div class="container">
      <h2>Where to Stay</h2>
      <a href="#" class="btn btn-secondary booking-affiliate-link"
         data-city="{{ content.field_city.0['#markup'] }}"
         target="_blank" rel="noopener">
        Find Hotels on Booking.com
      </a>
    </div>
  </section>

</article>
```

### JavaScript for Loading Deals

**packages/drupal/themes/custom/traveltomorrow/js/destination-deals.js:**
```javascript
(function (Drupal, once) {
  Drupal.behaviors.destinationDeals = {
    attach: function (context, settings) {
      once('destination-deals', '#deals-container', context).forEach(function (element) {
        const destinationId = element.dataset.destinationId;
        const apiUrl = drupalSettings.apiBaseUrl + '/destinations/' + destinationId + '/offers';

        fetch(apiUrl)
          .then(response => response.json())
          .then(data => {
            const container = element;
            container.innerHTML = '';

            if (data.offers && data.offers.length > 0) {
              data.offers.forEach(offer => {
                const card = createOfferCard(offer);
                container.appendChild(card);
              });
            } else {
              container.innerHTML = '<p>No deals available right now. Check back soon!</p>';
            }
          })
          .catch(error => {
            console.error('Failed to load deals:', error);
            element.innerHTML = '<p>Failed to load deals. Please try again later.</p>';
          });
      });
    }
  };

  function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = 'offer-card';

    const priceBadgeClass = offer.priceBadge ? `badge-${offer.priceBadge.toLowerCase()}` : '';

    card.innerHTML = `
      <div class="offer-price">
        <span class="currency">€</span>
        <span class="amount">${(offer.totalAmount / 100).toFixed(0)}</span>
        ${offer.priceBadge ? `<span class="price-badge ${priceBadgeClass}">${offer.priceBadge}</span>` : ''}
      </div>
      <div class="offer-dates">
        <div>${new Date(offer.outboundDate).toLocaleDateString()}</div>
        <div>→</div>
        <div>${new Date(offer.returnDate).toLocaleDateString()}</div>
      </div>
      <a href="/checkout?offer=${offer.id}" class="btn btn-primary">Book Now</a>
    `;

    return card;
  }
})(Drupal, once);
```

---

## 8. Bank Holiday Pages

### Bank Holiday Content Template

**packages/drupal/themes/custom/traveltomorrow/templates/node--bank-holiday-page.html.twig:**
```twig
<article{{ attributes.addClass('bank-holiday-page') }}>

  <div class="holiday-hero">
    <h1>{{ label }}</h1>
    <p class="holiday-date">{{ content.field_holiday_date }}</p>
  </div>

  <section class="holiday-content">
    <div class="container">
      {{ content.body }}
    </div>
  </section>

  <section class="holiday-destinations">
    <div class="container">
      <h2>Top Destinations for {{ content.field_holiday_name }}</h2>
      <div class="destination-grid">
        {# Load destinations from API #}
        <div id="holiday-destinations-container"
             data-country="{{ content.field_country_code.0['#markup'] }}"
             data-date="{{ content.field_holiday_date.0['#markup'] }}">
          Loading destinations...
        </div>
      </div>
    </div>
  </section>

</article>
```

---

## 9. Caching & Performance

**Configure Drupal caching:**
```bash
# Enable page cache and dynamic page cache
drush en -y page_cache dynamic_page_cache

# Configure cache settings
drush config:set system.performance cache.page.max_age 3600
drush config:set system.performance css.preprocess 1
drush config:set system.performance js.preprocess 1

# Clear cache
drush cr
```

---

## 10. Testing

### Test Destination Page SEO

**packages/drupal/__tests__/destination-seo.test.js:**
```javascript
const axios = require('axios');
const cheerio = require('cheerio');

describe('Destination Page SEO', () => {
  const BASE_URL = process.env.DRUPAL_URL || 'http://localhost:8080';

  it('should have proper JSON-LD schema', async () => {
    const response = await axios.get(`${BASE_URL}/destinations/barcelona`);
    const $ = cheerio.load(response.data);

    const schemaScript = $('script[type="application/ld+json"]').html();
    const schema = JSON.parse(schemaScript);

    expect(schema['@type']).toBe('TouristDestination');
    expect(schema.name).toContain('Barcelona');
    expect(schema.description).toBeDefined();
  });

  it('should have proper meta tags', async () => {
    const response = await axios.get(`${BASE_URL}/destinations/barcelona`);
    const $ = cheerio.load(response.data);

    expect($('meta[property="og:title"]').attr('content')).toContain('Barcelona');
    expect($('meta[property="og:description"]').attr('content')).toBeDefined();
    expect($('meta[property="og:image"]').attr('content')).toBeDefined();
    expect($('meta[name="twitter:card"]').attr('content')).toBe('summary_large_image');
  });

  it('should have canonical URL', async () => {
    const response = await axios.get(`${BASE_URL}/destinations/barcelona`);
    const $ = cheerio.load(response.data);

    const canonical = $('link[rel="canonical"]').attr('href');
    expect(canonical).toMatch(/destinations\/barcelona/);
  });
});
```

---

## Deliverables

- [ ] Drupal content types configured (Destination, Bank Holiday Page)
- [ ] JSON-LD schema implementation
- [ ] Sitemap generation (static pages + deals)
- [ ] Destination page templates with Twig
- [ ] API integration for dynamic deals
- [ ] Metatag configuration (OG, Twitter Cards)
- [ ] URL structure and pathauto patterns
- [ ] Bank holiday page templates
- [ ] SEO tests passing (Lighthouse >90)

## Success Criteria

1. ✅ Destination pages render with proper JSON-LD
2. ✅ Sitemap includes all published destinations
3. ✅ Meta tags properly configured for social sharing
4. ✅ Dynamic deals load from API
5. ✅ Lighthouse SEO score >90
6. ✅ All pages have canonical URLs
7. ✅ Bank holiday pages indexed

## Timeline

**Estimated Duration:** 2 weeks

---

**Next Stage:** [04-price-alerts.md](./04-price-alerts.md)
