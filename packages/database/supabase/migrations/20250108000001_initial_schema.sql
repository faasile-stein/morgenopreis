-- TravelTomorrow Initial Schema
-- This migration creates all tables for the TravelTomorrow platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('USER', 'EDITOR', 'PRICING_MANAGER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE price_badge AS ENUM ('GOOD', 'FAIR', 'POOR');
CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED');
CREATE TYPE ticketing_status AS ENUM ('NOT_ISSUED', 'ISSUING', 'ISSUED', 'FAILED');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- ============================================
-- USERS & AUTHENTICATION (Supabase Auth integration)
-- ============================================

-- Extend auth.users with our custom profile
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,

  -- Preferences
  home_airport_id TEXT,
  currency TEXT DEFAULT 'EUR',
  locale TEXT DEFAULT 'en',

  -- Gamification
  loyalty_points INTEGER DEFAULT 0,

  -- Role & Status
  role user_role DEFAULT 'USER',
  status user_status DEFAULT 'ACTIVE',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- User preferences (key-value store)
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(user_id, key)
);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- ============================================
-- AIRPORTS & LOCATIONS
-- ============================================

CREATE TABLE public.airports (
  iata_code TEXT PRIMARY KEY,
  icao_code TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timezone TEXT NOT NULL,

  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_airports_country_code ON public.airports(country_code);
CREATE INDEX idx_airports_popular_active ON public.airports(is_popular, is_active);
CREATE INDEX idx_airports_location ON public.airports(latitude, longitude);

-- ============================================
-- DESTINATIONS
-- ============================================

CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  airport_id TEXT NOT NULL REFERENCES public.airports(iata_code),

  -- Editorial content
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  itinerary_json JSONB,

  -- Media
  hero_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  video_url TEXT,

  -- Pricing & features
  base_price_eur INTEGER, -- in cents
  min_duration_days INTEGER DEFAULT 2,
  max_duration_days INTEGER DEFAULT 4,

  -- Classification
  trip_types TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  seasonality TEXT[] DEFAULT '{}',

  -- Admin controls
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 50,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,

  -- Affiliate
  booking_city_id TEXT,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  wheel_win_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_destinations_slug ON public.destinations(slug);
CREATE INDEX idx_destinations_airport ON public.destinations(airport_id);
CREATE INDEX idx_destinations_featured ON public.destinations(is_featured, is_published);
CREATE INDEX idx_destinations_country ON public.destinations(country_code);

-- Many-to-many: Destinations <-> Nearby Airports
CREATE TABLE public.destination_nearby_airports (
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  airport_id TEXT REFERENCES public.airports(iata_code) ON DELETE CASCADE,
  PRIMARY KEY (destination_id, airport_id)
);

-- ============================================
-- OFFERS & PRICING
-- ============================================

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Duffel data
  duffel_offer_id TEXT UNIQUE NOT NULL,
  duffel_offer_data JSONB NOT NULL,

  -- Route info
  departure_airport_id TEXT NOT NULL REFERENCES public.airports(iata_code),
  arrival_airport_id TEXT NOT NULL REFERENCES public.airports(iata_code),
  destination_id UUID REFERENCES public.destinations(id),

  -- Flight details
  outbound_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  is_round_trip BOOLEAN NOT NULL,
  cabin_class TEXT NOT NULL,

  -- Pricing
  currency TEXT NOT NULL,
  total_amount INTEGER NOT NULL, -- in cents
  base_fare INTEGER NOT NULL,
  taxes_amount INTEGER NOT NULL,

  -- Passengers
  adult_count INTEGER DEFAULT 1,
  child_count INTEGER DEFAULT 0,
  infant_count INTEGER DEFAULT 0,

  -- Fare conditions
  is_refundable BOOLEAN DEFAULT false,
  baggage_allowance JSONB,
  fare_conditions JSONB,

  -- Caching
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Price scoring
  price_score INTEGER,
  price_badge price_badge
);

CREATE INDEX idx_offers_duffel_id ON public.offers(duffel_offer_id);
CREATE INDEX idx_offers_route_date ON public.offers(departure_airport_id, arrival_airport_id, outbound_date);
CREATE INDEX idx_offers_destination ON public.offers(destination_id);
CREATE INDEX idx_offers_expires ON public.offers(expires_at);
CREATE INDEX idx_offers_price_score ON public.offers(price_score);

-- Price history for trending
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_key TEXT NOT NULL,
  destination_id UUID REFERENCES public.destinations(id),
  travel_date TIMESTAMP WITH TIME ZONE NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_history_route_date ON public.price_history(route_key, travel_date);
CREATE INDEX idx_price_history_destination ON public.price_history(destination_id, travel_date);
CREATE INDEX idx_price_history_created ON public.price_history(created_at);

-- ============================================
-- BOOKINGS
-- ============================================

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES public.users(id),
  offer_id UUID NOT NULL REFERENCES public.offers(id),

  -- Duffel order
  duffel_order_id TEXT UNIQUE NOT NULL,
  duffel_order_data JSONB NOT NULL,

  -- Passengers
  passengers JSONB NOT NULL,

  -- Payment
  payment_intent_id TEXT,
  payment_status payment_status DEFAULT 'PENDING',
  total_paid INTEGER NOT NULL,
  currency TEXT NOT NULL,

  -- Status
  status booking_status DEFAULT 'PENDING',
  ticketing_status ticketing_status DEFAULT 'NOT_ISSUED',

  -- Tickets
  tickets JSONB,

  -- Extras
  has_luggage BOOLEAN DEFAULT false,
  has_seat_selection BOOLEAN DEFAULT false,
  extras_data JSONB,

  -- Metadata
  booking_reference TEXT,
  confirmation_email TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_duffel_order ON public.bookings(duffel_order_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_created ON public.bookings(created_at);

-- ============================================
-- PRICE ALERTS
-- ============================================

CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  route_key TEXT,
  destination_id UUID REFERENCES public.destinations(id),

  departure_date TIMESTAMP WITH TIME ZONE,
  return_date TIMESTAMP WITH TIME ZONE,
  threshold_price INTEGER,
  threshold_percent INTEGER,

  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP WITH TIME ZONE,
  notification_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user_active ON public.price_alerts(user_id, is_active);
CREATE INDEX idx_price_alerts_route ON public.price_alerts(route_key);
CREATE INDEX idx_price_alerts_destination ON public.price_alerts(destination_id);

-- ============================================
-- WHEEL & GAMIFICATION
-- ============================================

CREATE TABLE public.wheel_spins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),

  departure_airport_id TEXT NOT NULL,
  preferences JSONB,

  result_destination_id UUID REFERENCES public.destinations(id),
  offers_shown JSONB NOT NULL,

  did_click_offer BOOLEAN DEFAULT false,
  did_book BOOLEAN DEFAULT false,

  session_id TEXT,
  ip_address TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wheel_spins_user ON public.wheel_spins(user_id);
CREATE INDEX idx_wheel_spins_destination ON public.wheel_spins(result_destination_id);
CREATE INDEX idx_wheel_spins_created ON public.wheel_spins(created_at);

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many: Users <-> Badges
CREATE TABLE public.user_badges (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- ============================================
-- BANK HOLIDAYS & EDITORIAL
-- ============================================

CREATE TABLE public.bank_holiday_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL,

  holiday_name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  year INTEGER NOT NULL,

  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,

  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_holiday_slug ON public.bank_holiday_pages(slug);
CREATE INDEX idx_bank_holiday_country_year ON public.bank_holiday_pages(country_code, year);

-- Many-to-many: Bank Holiday Pages <-> Destinations
CREATE TABLE public.bank_holiday_destinations (
  bank_holiday_page_id UUID REFERENCES public.bank_holiday_pages(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  PRIMARY KEY (bank_holiday_page_id, destination_id)
);

-- ============================================
-- AFFILIATE TRACKING
-- ============================================

CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  destination_id UUID REFERENCES public.destinations(id),

  partner TEXT NOT NULL,
  affiliate_id TEXT NOT NULL,
  click_url TEXT NOT NULL,

  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_affiliate_clicks_partner ON public.affiliate_clicks(partner, created_at);
CREATE INDEX idx_affiliate_clicks_destination ON public.affiliate_clicks(destination_id);

CREATE TABLE public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  click_id UUID REFERENCES public.affiliate_clicks(id),
  partner TEXT NOT NULL,

  booking_value INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  currency TEXT NOT NULL,

  conversion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_affiliate_conversions_partner ON public.affiliate_conversions(partner, conversion_date);

-- ============================================
-- ADMIN & AUDIT
-- ============================================

CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),

  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  change_data JSONB,

  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_user ON public.admin_actions(user_id, created_at);
CREATE INDEX idx_admin_actions_entity ON public.admin_actions(entity_type, entity_id);

-- ============================================
-- EMAIL CAMPAIGNS
-- ============================================

CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,

  target_segment TEXT,
  target_country TEXT,

  status campaign_status DEFAULT 'DRAFT',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status, scheduled_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_holiday_pages_updated_at BEFORE UPDATE ON public.bank_holiday_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create public.users entry when auth.users is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
