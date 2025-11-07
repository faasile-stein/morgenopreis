— Elevator / product overview

MorgenOpreis.be / TravelTomorrow is an impulse-friendly travel product (web + app) where users can spin a wheel to instantly pick a next destination for a short trip. Bookings (flight search & ticketing) are handled with Duffel; accommodation links use Booking.com affiliate links or networks. The public website is SEO-first (Drupal) and shows curated destination pages (top weekend trips, bank-holiday pages per country, best prices now). Admins set destination prices, upload copy/pictures/itineraries, and control price-alert emails. Users can sign up for price alerts and see a dynamic “how good is this price now” rating.

Key third-party pieces:

Duffel for flight offers & booking orchestration. 
duffel.com
+1

Booking.com affiliate links / networks for accommodation and partner links. 
Booking.com
+1

Drupal site uses JSON-LD / Schema.org for SEO-rich pages. 
Drupal.org

2 — Primary user stories

As an impulse traveler, I can spin a wheel and get a curated destination suggestion from my nearest airport and book it quickly.

As a signed user, I can subscribe to price alerts for specific routes/dates and receive emails when prices improve.

As an admin, I can set destination base prices, upload copy/images/itineraries, toggle featured status, and control bank-holiday pages per country.

As a publisher/SEO manager, I can publish rich, crawlable destination pages (JSON-LD) and a sitemap of deals.

As a conversion analyst, I can see funnel metrics (wheel spins → offer view → booking) and test “good-price-now” thresholds.

3 — Core features (user-facing)

Spin-Wheel Flow

Wheel UI (desktop & mobile) seeded with nearby airports + curated destination set (admin controlled + dynamically scored).

When user spins:

we determine nearest airport (by user geolocation / IP fallback),

generate several candidate offers (via Duffel offer requests),

show 1–3 “instant deals” (price badge: Good / Fair / Poor) and an estimated itinerary,

one-tap “Book” moves to checkout (Duffel booking flow) with pre-filled passenger/payment options (if saved).

Search & Discovery

Browse by city, weekend, or bank-holiday (country-specific pages).

Filter by travel time (max flight duration), budget, and trip type (romantic, outdoors, city break).

Price & “Good price” indicator

Show current price and an indexed indicator (e.g., green/good / amber/fair / red/expensive) computed from historical price database + heuristics (percentile over last 30/90/365 days).

Provide confidence & brief explanation (“Price is in the best 15% historically for this route”).

Booking flow & payment

Search and offers through Duffel (offer request → select offer → create order). Duffel handles ticketing/fulfillment and returns booking/order objects. 
duffel.com
+1

Support one-click express checkout (stored payment tokens / PCI-compliant processor) or redirect-to-Duffel-hosted flow as required.

Accommodation & extras

Show aggregated links to Booking.com (affiliate) for hotels; include deep links / affiliate IDs for tracking. 
Booking.com
+1

Option to add luggage / seats via Duffel where supported.

Price alerts & email

Users can subscribe to route/date alerts with notification thresholds (absolute price or % drop).

Admin can configure email templates and frequency; front-end shows current alert status.

SEO-focused public site (Drupal)

Destination pages (country/city/bank-holiday) with editorial copy, itinerary, images, structured data (JSON-LD Restaurant / TravelAction / Itinerary schema), and canonical URLs for crawlability. Use Drupal modules and JSON-LD best practices. 
Drupal.org

Mobile app (Expo or native)

Wheel + instant offers, sign-in, saved preferences, push notifications for price alerts, and quick checkout.

4 — Admin & editorial features

Destination editor: set base price, recommended dates, copy, hero images, gallery, and an “ideal itinerary” (structured fields).

Price manager: override or seed prices for special promotions; set “good-price” thresholds per destination.

Holiday pages: create country-specific special bank-holiday pages (content + dynamic deals).

Deals scheduler: set time-limited sale windows (start/end times) and promote via homepage banners.

Email & alerts console: view subscribers, scheduled campaigns, throttle settings, and blast history.

Audit & moderation: booking logs, refund actions, and ability to unpublish a destination.

Affiliate management: manage Booking.com (and other partner) affiliate IDs and link templates.

Duffel console: monitor offer volumes, error logs, and rebook/resend confirmations if needed.

Security: admin SSO + role-based access (editor, pricing-manager, ops, super-admin), admin activity logging.

5 — SEO & Drupal implementation notes

Use Drupal as CMS for public pages with a focus on server-side rendering and JSON-LD structured data (Schema.org) for Destination, Itinerary, Event (bank-holiday). This drives organic discovery and rich snippets. JSON-LD is preferred for Drupal structured data. 
Drupal.org

Pre-generate & cache city/weekend landing pages; use dynamic incremental updates for new deals (sitemaps & on-demand ISR-like behavior).

Implement canonical URLs, hreflang if multiple locales, and compact, shareable meta descriptions for impulse searchers.

Ensure page markup includes machine-readable price / availability snippets so search engines can surface deals.

6 — Integrations & technical pieces

Duffel (flights)

Use Duffel Offer Requests to search and generate priceable offers; create orders for bookings via Duffel’s API. Follow Duffel docs for offer_request → offers → orders. 
duffel.com
+1

Keep a local cache of offers with TTL to avoid repeated search costs; store offer_id, slices, price, fare_conditions, and refundability.

Handle asynchronous hooks/callbacks from Duffel for order updates and ticket issuance.

Booking/Accommodation Affiliates

Use Booking.com Affiliate Program or networks (Awin/CJ depending on region) to generate tracked links and banners. Use affiliate link APIs or static deep links per partner docs. 
Booking.com
+1

Payments

Use a PCI-compliant gateway (Stripe / Adyen) to store payment methods (tokens). For full Duffel-managed flows, follow Duffel’s recommended payment capture flow.

Price Data & “Good price” engine

Historical price DB: store recent search results (timestamped offers) and compute rolling percentiles per route/date combination.

Compute a normalized “price_score” (0–100) used for color badges and alert triggers.

Geolocation & airport selection

Determine nearest airport(s) via geodata (local dataset or external API); prefer a pre-built airport list for low latency. Allow user to override.

Analytics & tracking

Capture funnel: wheel spins, offers shown, offers clicked, orders started, bookings completed. Feed to analytics (Mixpanel / GA4 / Snowplow) and a reporting dashboard.

7 — Data model (high level)

Core tables / entities:

users, profiles, preferences

airports (IATA code, lat/lng, city, name)

destinations (city, country, meta, editorial copy, itinerary JSON, images, admin_overrides)

offers (offer_id, route, slices, price_currency, fare_conditions, source, cached_at, expires_at)

bookings (local booking record, duffel_order_id, status, passenger data, payment_token, created_at)

price_history (route_key, date, price, source, created_at)

alerts (user_id, route_key or destination_id, threshold, last_notified_at)

affiliate_links (partner, template, partner_params)

admin_actions (audit log)

Store content & images in a CDN-backed storage (Drupal media library + storage adapter).

8 — API & flows (sequence summaries)

Spin Wheel → Offer flow (client → server):

Client requests POST /api/wheel/spin with user_location, preferences.

Server resolves nearest airport(s) → picks candidate destinations (mix of admin-curated + algorithmic suggestions).

For top candidates, server issues Duffel offer_request (or looks up cached offers). 
duffel.com

Server returns 1–3 offer summaries to client with price_score & CTA.

Client shows animated wheel + landing card. Book CTA triggers POST /api/book (passenger data or user token).

Backend calls Duffel to create an order / payment flow; on success, store booking, send confirmation email.

Price-alert flow:

User subscribes: POST /api/alerts (route/destination, threshold).

Background worker recomputes price signals (cron every N hours) and triggers email/push if threshold met.

Booking flow (Duffel):

Use Duffel sequence: create offer_request → receive offers → select offer → create order → handle payment → listen for webhooks for order updates. 
duffel.com

Affiliate hotel click:

Destination page returns affiliate deep link with tracking parameters (affiliate_id, campaign_id), store click for reporting. 
affiliates.support.booking.com

9 — UX & conversion features for impulse buying

Prominent “Spin to decide” CTA on homepage.

Limited-time countdown badges for each instant deal (e.g., “Offer reserved for 12 minutes”).

“Good price now” badge + brief tooltip explaining historical percentile.

One-tap express checkout with prefilled traveler info and stored tokens.

Push/email nudge for last-minute drop alerts (“Price dropped 18% — depart tomorrow morning!”).

Social share cards & pre-filled copy for Instagram/WhatsApp.

10 — Gamification & retention

Badges for first booking, early-bird bookings, multiple weekend trips.

Streaks for weekly spins or booked weekends.

Referral credit for inviting friends (discount or travel credit).

Loyalty points convertible to discounts or booking credits (admin configurable).

11 — Admin controls (detailed)

Destination editor (copy, hero image, optional price override, itinerary).

Pricing rules & thresholds (auto vs manual): set percentile bands that map to Good/Fair/Poor.

Bank-holiday pages: content editor + dynamic listing of deals relevant to the holiday & country.

Alerts & campaigns: create email campaigns; schedule blasts.

Duffel & affiliate key management: rotate keys, test connections.

Audit: booking & admin action logs; refund controls.

12 — Compliance, security & operations

PCI & GDPR: store minimal PII; payment tokens via PCI provider; user consent for emails; data deletion workflow.

Duffel API keys and affiliate keys stored securely (vault / environment variables); never exposed to client. 
duffel.com

Rate-limiting and caching for Duffel calls to avoid quota hits; cache offers with TTL.

Provide opt-out / takedown flow for destinations if needed.

13 — Monitoring & metrics

Key metrics:

Wheel spins / unique spinners

Offers viewed per spin

Click-to-book conversion (%)

Booking completion rate (Duffel order success)

Email alert open/click-to-book conversions

“Good price” accuracy (alert precision)

Average response times for offer requests & bookings

Track via GA4 + server-side event pipeline (Mixpanel/Segment + warehouse).

14 — Development plan (phased)

Phase 0 — Foundations

Provision infra (Drupal host, API server, database, storage, keys for Duffel & affiliate accounts).

Implement airports dataset & geolocation API.

Basic Next/Drupal public pages & editorial content model.

Phase 1 — Wheel MVP + Duffel integration

Build wheel UI (client) + backend wheel/spin endpoint.

Implement Duffel offer_request integration and local offer caching (offer store + TTL). 
duffel.com

Implement booking checkout via Duffel order creation. Basic confirmation emails.

Phase 2 — SEO & editorial pages

Expand Drupal pages: city/weekend pages, bank-holiday pages, JSON-LD/Schema markup, sitemaps. 
Drupal.org

Phase 3 — Alerts, price-history & “good price” engine

Implement price history ingestion, price-score engine, and alerts (email & push).

Admin UI for setting thresholds & campaigns.

Phase 4 — Affiliates & extras

Add Booking.com affiliate links & partner integration (Awin/CJ if region requires). 
Booking.com
+1

Accommodation deep-linking & tracking; affiliate reporting.

Phase 5 — Polish & scale

Performance & reliability improvements, caching, SRE, analytics, and marketing experiments (A/B test CTA copy, wheel designs).

15 — Testing & QA

Unit & integration tests for offer flows and API contracts (mock Duffel responses).

E2E tests for spin → offer → booking flows (use Sandbox Duffel environment). 
duffel.com

Accessibility & Lighthouse checks for SEO pages.

Load testing on peak campaign scenarios.

16 — Deliverables I can generate next (pick any)

Detailed API contract / OpenAPI for the wheel, offers, booking, and alerts endpoints (ready for backend devs).

Example Duffel integration sample (Node.js) implementing offer_request → offer selection → order creation. 
duffel.com
+1

Drupal content type definitions & JSON-LD templates for Destination / Itinerary / Event pages. 
Drupal.org

SQL schema for price_history + offers + alerts tables.

Tell me which one you want first and I’ll produce it right away.
