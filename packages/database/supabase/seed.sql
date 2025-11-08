-- Seed Data for TravelTomorrow
-- Run this after migrations to populate initial data

-- ============================================
-- AIRPORTS
-- ============================================

INSERT INTO public.airports (iata_code, icao_code, name, city, country, country_code, latitude, longitude, timezone, is_popular) VALUES
('BRU', 'EBBR', 'Brussels Airport', 'Brussels', 'Belgium', 'BE', 50.9014, 4.4844, 'Europe/Brussels', true),
('CDG', 'LFPG', 'Charles de Gaulle Airport', 'Paris', 'France', 'FR', 49.0097, 2.5479, 'Europe/Paris', true),
('AMS', 'EHAM', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 'NL', 52.3086, 4.7639, 'Europe/Amsterdam', true),
('LHR', 'EGLL', 'London Heathrow Airport', 'London', 'United Kingdom', 'GB', 51.4700, -0.4543, 'Europe/London', true),
('BCN', 'LEBL', 'Barcelona–El Prat Airport', 'Barcelona', 'Spain', 'ES', 41.2971, 2.0785, 'Europe/Madrid', true),
('MAD', 'LEMD', 'Adolfo Suárez Madrid–Barajas Airport', 'Madrid', 'Spain', 'ES', 40.4719, -3.5626, 'Europe/Madrid', true),
('FCO', 'LIRF', 'Leonardo da Vinci–Fiumicino Airport', 'Rome', 'Italy', 'IT', 41.8003, 12.2389, 'Europe/Rome', true),
('FRA', 'EDDF', 'Frankfurt Airport', 'Frankfurt', 'Germany', 'DE', 50.0379, 8.5622, 'Europe/Berlin', true),
('MUC', 'EDDM', 'Munich Airport', 'Munich', 'Germany', 'DE', 48.3538, 11.7861, 'Europe/Berlin', true),
('LIS', 'LPPT', 'Lisbon Portela Airport', 'Lisbon', 'Portugal', 'PT', 38.7813, -9.1357, 'Europe/Lisbon', true),
('OPO', 'LPPR', 'Francisco Sá Carneiro Airport', 'Porto', 'Portugal', 'PT', 41.2481, -8.6814, 'Europe/Lisbon', true),
('VIE', 'LOWW', 'Vienna International Airport', 'Vienna', 'Austria', 'AT', 48.1103, 16.5697, 'Europe/Vienna', true),
('ZRH', 'LSZH', 'Zurich Airport', 'Zurich', 'Switzerland', 'CH', 47.4647, 8.5492, 'Europe/Zurich', true),
('CPH', 'EKCH', 'Copenhagen Airport', 'Copenhagen', 'Denmark', 'DK', 55.6180, 12.6508, 'Europe/Copenhagen', true),
('ARN', 'ESSA', 'Stockholm Arlanda Airport', 'Stockholm', 'Sweden', 'SE', 59.6519, 17.9186, 'Europe/Stockholm', true),
('OSL', 'ENGM', 'Oslo Airport, Gardermoen', 'Oslo', 'Norway', 'NO', 60.1939, 11.1004, 'Europe/Oslo', true),
('DUB', 'EIDW', 'Dublin Airport', 'Dublin', 'Ireland', 'IE', 53.4213, -6.2701, 'Europe/Dublin', true),
('PRG', 'LKPR', 'Václav Havel Airport Prague', 'Prague', 'Czech Republic', 'CZ', 50.1008, 14.2600, 'Europe/Prague', true),
('WAW', 'EPWA', 'Warsaw Chopin Airport', 'Warsaw', 'Poland', 'PL', 52.1657, 20.9671, 'Europe/Warsaw', true),
('BUD', 'LHBP', 'Budapest Ferenc Liszt International Airport', 'Budapest', 'Hungary', 'HU', 47.4369, 19.2556, 'Europe/Budapest', true),
('ATH', 'LGAV', 'Athens International Airport', 'Athens', 'Greece', 'GR', 37.9364, 23.9445, 'Europe/Athens', true),
('IST', 'LTFM', 'Istanbul Airport', 'Istanbul', 'Turkey', 'TR', 41.2753, 28.7519, 'Europe/Istanbul', true),
('MXP', 'LIMC', 'Milan Malpensa Airport', 'Milan', 'Italy', 'IT', 45.6301, 8.7277, 'Europe/Rome', false),
('VCE', 'LIPZ', 'Venice Marco Polo Airport', 'Venice', 'Italy', 'IT', 45.5053, 12.3519, 'Europe/Rome', false),
('NCE', 'LFMN', 'Nice Côte d''Azur Airport', 'Nice', 'France', 'FR', 43.6584, 7.2159, 'Europe/Paris', false),
('EDI', 'EGPH', 'Edinburgh Airport', 'Edinburgh', 'United Kingdom', 'GB', 55.9500, -3.3725, 'Europe/London', false),
('MAN', 'EGCC', 'Manchester Airport', 'Manchester', 'United Kingdom', 'GB', 53.3537, -2.2750, 'Europe/London', false),
('STN', 'EGSS', 'London Stansted Airport', 'London', 'United Kingdom', 'GB', 51.8860, 0.2389, 'Europe/London', false),
('LGW', 'EGKK', 'London Gatwick Airport', 'London', 'United Kingdom', 'GB', 51.1537, -0.1821, 'Europe/London', false),
('GVA', 'LSGG', 'Geneva Airport', 'Geneva', 'Switzerland', 'CH', 46.2381, 6.1090, 'Europe/Zurich', false)
ON CONFLICT (iata_code) DO NOTHING;

-- ============================================
-- DESTINATIONS
-- ============================================

INSERT INTO public.destinations (
  city, country, country_code, airport_id, slug, title,
  short_description, long_description,
  base_price_eur, min_duration_days, max_duration_days,
  trip_types, tags, seasonality,
  is_featured, is_published, published_at, priority, booking_city_id
) VALUES
(
  'Barcelona', 'Spain', 'ES', 'BCN', 'barcelona-weekend-break', 'Barcelona Weekend Break',
  'Experience Gaudí, beaches, and tapas in vibrant Barcelona',
  'Barcelona is the perfect weekend destination with its unique architecture, beautiful Mediterranean beaches, and world-class cuisine. Explore the Gothic Quarter, marvel at Sagrada Familia, and enjoy the vibrant nightlife.',
  15000, 2, 4,
  ARRAY['city-break', 'romantic', 'culture'],
  ARRAY['architecture', 'beach', 'food', 'nightlife'],
  ARRAY['spring', 'summer', 'fall'],
  true, true, NOW(), 90, '-372490'
),
(
  'Porto', 'Portugal', 'PT', 'OPO', 'porto-wine-weekend', 'Porto Wine & Culture Weekend',
  'Explore historic Porto and taste world-famous port wine',
  'Discover the charming city of Porto with its colorful buildings, historic wine cellars, and delicious cuisine. Walk along the Douro River, visit the port wine lodges, and enjoy the authentic Portuguese atmosphere.',
  12000, 2, 3,
  ARRAY['city-break', 'culture', 'food'],
  ARRAY['wine', 'history', 'food', 'riverside'],
  ARRAY['spring', 'summer', 'fall'],
  true, true, NOW(), 85, '-2173088'
),
(
  'Prague', 'Czech Republic', 'CZ', 'PRG', 'prague-magical-weekend', 'Magical Prague Weekend',
  'Discover the fairy-tale charm of Prague',
  'Prague is a magical city with its stunning medieval architecture, cobblestone streets, and vibrant cultural scene. Visit Prague Castle, walk across Charles Bridge, and enjoy traditional Czech beer.',
  11000, 2, 4,
  ARRAY['city-break', 'romantic', 'culture'],
  ARRAY['history', 'architecture', 'beer', 'culture'],
  ARRAY['spring', 'summer', 'fall', 'winter'],
  true, true, NOW(), 80, '-553173'
),
(
  'Copenhagen', 'Denmark', 'DK', 'CPH', 'copenhagen-hygge-escape', 'Copenhagen Hygge Escape',
  'Experience Danish coziness and design in Copenhagen',
  'Copenhagen offers the perfect blend of Scandinavian design, cozy cafes, and world-class dining. Explore Nyhavn, visit Tivoli Gardens, and discover the concept of hygge in the happiest city.',
  18000, 2, 4,
  ARRAY['city-break', 'culture', 'food'],
  ARRAY['design', 'food', 'cycling', 'hygge'],
  ARRAY['spring', 'summer', 'fall'],
  true, true, NOW(), 75, '-2601889'
),
(
  'Dublin', 'Ireland', 'IE', 'DUB', 'dublin-pub-culture', 'Dublin Pub Culture & History',
  'Immerse yourself in Irish culture and friendly pubs',
  'Dublin is a city of literature, music, and legendary pub culture. Visit the Guinness Storehouse, explore Trinity College, and enjoy traditional Irish music in Temple Bar.',
  14000, 2, 3,
  ARRAY['city-break', 'culture', 'nightlife'],
  ARRAY['beer', 'music', 'history', 'literature'],
  ARRAY['spring', 'summer', 'fall'],
  false, true, NOW(), 70, '-1502554'
),
(
  'Lisbon', 'Portugal', 'PT', 'LIS', 'lisbon-hills-trams', 'Lisbon: Hills, Trams & Pastéis',
  'Ride yellow trams through historic neighborhoods',
  'Lisbon captivates with its colorful tiles, historic trams, and delicious pastéis de nata. Explore the hilly neighborhoods of Alfama and Bairro Alto, and enjoy stunning sunset views.',
  13000, 2, 4,
  ARRAY['city-break', 'culture', 'food'],
  ARRAY['trams', 'food', 'sunset', 'history'],
  ARRAY['spring', 'summer', 'fall', 'winter'],
  false, true, NOW(), 78, '-2167973'
),
(
  'Vienna', 'Austria', 'AT', 'VIE', 'vienna-imperial-elegance', 'Vienna Imperial Elegance',
  'Discover imperial palaces and coffee culture',
  'Vienna is a city of imperial grandeur, classical music, and elegant coffee houses. Visit Schönbrunn Palace, attend a concert, and enjoy Sachertorte in a traditional café.',
  16000, 2, 4,
  ARRAY['city-break', 'romantic', 'culture'],
  ARRAY['history', 'music', 'coffee', 'palaces'],
  ARRAY['spring', 'summer', 'fall', 'winter'],
  false, true, NOW(), 72, '-1995499'
),
(
  'Athens', 'Greece', 'GR', 'ATH', 'athens-ancient-wonders', 'Athens: Ancient Wonders',
  'Walk among ancient ruins and modern Greek life',
  'Athens combines ancient history with vibrant modern culture. Explore the Acropolis, wander through Plaka, and enjoy delicious Greek cuisine with views of the Parthenon.',
  17000, 3, 4,
  ARRAY['city-break', 'culture', 'history'],
  ARRAY['ancient-ruins', 'food', 'history', 'mythology'],
  ARRAY['spring', 'fall', 'winter'],
  false, true, NOW(), 76, '-814876'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- BADGES
-- ============================================

INSERT INTO public.badges (code, name, description) VALUES
('first_booking', 'First Trip', 'Made your first booking with TravelTomorrow'),
('early_bird', 'Early Bird', 'Booked 30+ days in advance'),
('weekend_warrior', 'Weekend Warrior', 'Completed 5 weekend trips'),
('lucky_spinner', 'Lucky Spinner', 'Spun the wheel 10 times'),
('deal_hunter', 'Deal Hunter', 'Booked a "Good Price" deal'),
('spontaneous', 'Spontaneous Traveler', 'Booked within 48 hours of departure'),
('explorer', 'Explorer', 'Visited 10 different cities'),
('price_alert_pro', 'Price Alert Pro', 'Set up 5 price alerts')
ON CONFLICT (code) DO NOTHING;
