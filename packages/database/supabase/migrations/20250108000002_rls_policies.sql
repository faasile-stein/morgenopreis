-- Row Level Security (RLS) Policies
-- This migration sets up security policies for all tables

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_nearby_airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_holiday_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_holiday_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- USER PREFERENCES
-- ============================================

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- AIRPORTS (Public Read)
-- ============================================

CREATE POLICY "Anyone can view active airports"
  ON public.airports FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage airports"
  ON public.airports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- DESTINATIONS (Public Read for Published)
-- ============================================

CREATE POLICY "Anyone can view published destinations"
  ON public.destinations FOR SELECT
  USING (is_published = true);

CREATE POLICY "Editors can view all destinations"
  ON public.destinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('EDITOR', 'PRICING_MANAGER', 'ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Editors can manage destinations"
  ON public.destinations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('EDITOR', 'PRICING_MANAGER', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- DESTINATION NEARBY AIRPORTS
-- ============================================

CREATE POLICY "Anyone can view destination airports"
  ON public.destination_nearby_airports FOR SELECT
  USING (true);

CREATE POLICY "Editors can manage destination airports"
  ON public.destination_nearby_airports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('EDITOR', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- OFFERS (Public Read for Active)
-- ============================================

CREATE POLICY "Anyone can view active offers"
  ON public.offers FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "System can insert offers"
  ON public.offers FOR INSERT
  WITH CHECK (true); -- Service role only

-- ============================================
-- PRICE HISTORY (Public Read)
-- ============================================

CREATE POLICY "Anyone can view price history"
  ON public.price_history FOR SELECT
  USING (true);

CREATE POLICY "System can insert price history"
  ON public.price_history FOR INSERT
  WITH CHECK (true); -- Service role only

-- ============================================
-- BOOKINGS
-- ============================================

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update all bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- PRICE ALERTS
-- ============================================

CREATE POLICY "Users can view own price alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own price alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- WHEEL SPINS
-- ============================================

CREATE POLICY "Users can view own wheel spins"
  ON public.wheel_spins FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create wheel spins"
  ON public.wheel_spins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all wheel spins"
  ON public.wheel_spins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- BADGES
-- ============================================

CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage badges"
  ON public.badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- USER BADGES
-- ============================================

CREATE POLICY "Users can view own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view user badges"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "System can award badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (true); -- Service role only

-- ============================================
-- BANK HOLIDAY PAGES (Public Read for Published)
-- ============================================

CREATE POLICY "Anyone can view published bank holiday pages"
  ON public.bank_holiday_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Editors can manage bank holiday pages"
  ON public.bank_holiday_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('EDITOR', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- BANK HOLIDAY DESTINATIONS
-- ============================================

CREATE POLICY "Anyone can view bank holiday destinations"
  ON public.bank_holiday_destinations FOR SELECT
  USING (true);

CREATE POLICY "Editors can manage bank holiday destinations"
  ON public.bank_holiday_destinations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('EDITOR', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- AFFILIATE CLICKS
-- ============================================

CREATE POLICY "Users can view own affiliate clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create affiliate clicks"
  ON public.affiliate_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all affiliate clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- AFFILIATE CONVERSIONS
-- ============================================

CREATE POLICY "Admins can view affiliate conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can insert affiliate conversions"
  ON public.affiliate_conversions FOR INSERT
  WITH CHECK (true); -- Service role only

-- ============================================
-- ADMIN ACTIONS
-- ============================================

CREATE POLICY "Admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert admin actions"
  ON public.admin_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================
-- EMAIL CAMPAIGNS
-- ============================================

CREATE POLICY "Admins can view email campaigns"
  ON public.email_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can manage email campaigns"
  ON public.email_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
