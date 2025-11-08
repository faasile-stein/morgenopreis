import { PrismaClient } from './generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedAirports() {
  console.log('🛫 Seeding airports...');

  // Load airports from JSON
  const airportsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data/airports.json'), 'utf-8')
  );

  for (const airport of airportsData) {
    await prisma.airport.upsert({
      where: { iataCode: airport.iataCode },
      update: {},
      create: {
        iataCode: airport.iataCode,
        icaoCode: airport.icaoCode,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        countryCode: airport.countryCode,
        latitude: airport.latitude,
        longitude: airport.longitude,
        timezone: airport.timezone,
        isPopular: airport.isPopular || false,
        isActive: true,
      },
    });
  }

  console.log(`✅ Seeded ${airportsData.length} airports`);
}

async function seedDestinations() {
  console.log('🏖️  Seeding sample destinations...');

  const sampleDestinations = [
    {
      city: 'Barcelona',
      country: 'Spain',
      countryCode: 'ES',
      airportId: 'BCN',
      slug: 'barcelona-weekend-break',
      title: 'Barcelona Weekend Break',
      shortDescription: 'Experience Gaudí, beaches, and tapas in vibrant Barcelona',
      longDescription: 'Barcelona is the perfect weekend destination with its unique architecture, beautiful Mediterranean beaches, and world-class cuisine. Explore the Gothic Quarter, marvel at Sagrada Familia, and enjoy the vibrant nightlife.',
      basePriceEur: 15000, // €150
      minDurationDays: 2,
      maxDurationDays: 4,
      tripTypes: ['city-break', 'romantic', 'culture'],
      tags: ['architecture', 'beach', 'food', 'nightlife'],
      seasonality: ['spring', 'summer', 'fall'],
      isFeatured: true,
      isPublished: true,
      priority: 90,
      publishedAt: new Date(),
      bookingCityId: '-372490',
    },
    {
      city: 'Porto',
      country: 'Portugal',
      countryCode: 'PT',
      airportId: 'OPO',
      slug: 'porto-wine-weekend',
      title: 'Porto Wine & Culture Weekend',
      shortDescription: 'Explore historic Porto and taste world-famous port wine',
      longDescription: 'Discover the charming city of Porto with its colorful buildings, historic wine cellars, and delicious cuisine. Walk along the Douro River, visit the port wine lodges, and enjoy the authentic Portuguese atmosphere.',
      basePriceEur: 12000, // €120
      minDurationDays: 2,
      maxDurationDays: 3,
      tripTypes: ['city-break', 'culture', 'food'],
      tags: ['wine', 'history', 'food', 'riverside'],
      seasonality: ['spring', 'summer', 'fall'],
      isFeatured: true,
      isPublished: true,
      priority: 85,
      publishedAt: new Date(),
      bookingCityId: '-2173088',
    },
    {
      city: 'Prague',
      country: 'Czech Republic',
      countryCode: 'CZ',
      airportId: 'PRG',
      slug: 'prague-magical-weekend',
      title: 'Magical Prague Weekend',
      shortDescription: 'Discover the fairy-tale charm of Prague',
      longDescription: 'Prague is a magical city with its stunning medieval architecture, cobblestone streets, and vibrant cultural scene. Visit Prague Castle, walk across Charles Bridge, and enjoy traditional Czech beer.',
      basePriceEur: 11000, // €110
      minDurationDays: 2,
      maxDurationDays: 4,
      tripTypes: ['city-break', 'romantic', 'culture'],
      tags: ['history', 'architecture', 'beer', 'culture'],
      seasonality: ['spring', 'summer', 'fall', 'winter'],
      isFeatured: true,
      isPublished: true,
      priority: 80,
      publishedAt: new Date(),
      bookingCityId: '-553173',
    },
    {
      city: 'Copenhagen',
      country: 'Denmark',
      countryCode: 'DK',
      airportId: 'CPH',
      slug: 'copenhagen-hygge-escape',
      title: 'Copenhagen Hygge Escape',
      shortDescription: 'Experience Danish coziness and design in Copenhagen',
      longDescription: 'Copenhagen offers the perfect blend of Scandinavian design, cozy cafes, and world-class dining. Explore Nyhavn, visit Tivoli Gardens, and discover the concept of hygge in the happiest city.',
      basePriceEur: 18000, // €180
      minDurationDays: 2,
      maxDurationDays: 4,
      tripTypes: ['city-break', 'culture', 'food'],
      tags: ['design', 'food', 'cycling', 'hygge'],
      seasonality: ['spring', 'summer', 'fall'],
      isFeatured: true,
      isPublished: true,
      priority: 75,
      publishedAt: new Date(),
      bookingCityId: '-2601889',
    },
    {
      city: 'Dublin',
      country: 'Ireland',
      countryCode: 'IE',
      airportId: 'DUB',
      slug: 'dublin-pub-culture',
      title: 'Dublin Pub Culture & History',
      shortDescription: 'Immerse yourself in Irish culture and friendly pubs',
      longDescription: 'Dublin is a city of literature, music, and legendary pub culture. Visit the Guinness Storehouse, explore Trinity College, and enjoy traditional Irish music in Temple Bar.',
      basePriceEur: 14000, // €140
      minDurationDays: 2,
      maxDurationDays: 3,
      tripTypes: ['city-break', 'culture', 'nightlife'],
      tags: ['beer', 'music', 'history', 'literature'],
      seasonality: ['spring', 'summer', 'fall'],
      isFeatured: false,
      isPublished: true,
      priority: 70,
      publishedAt: new Date(),
      bookingCityId: '-1502554',
    },
    {
      city: 'Lisbon',
      country: 'Portugal',
      countryCode: 'PT',
      airportId: 'LIS',
      slug: 'lisbon-hills-trams',
      title: 'Lisbon: Hills, Trams & Pastéis',
      shortDescription: 'Ride yellow trams through historic neighborhoods',
      longDescription: 'Lisbon captivates with its colorful tiles, historic trams, and delicious pastéis de nata. Explore the hilly neighborhoods of Alfama and Bairro Alto, and enjoy stunning sunset views.',
      basePriceEur: 13000, // €130
      minDurationDays: 2,
      maxDurationDays: 4,
      tripTypes: ['city-break', 'culture', 'food'],
      tags: ['trams', 'food', 'sunset', 'history'],
      seasonality: ['spring', 'summer', 'fall', 'winter'],
      isFeatured: false,
      isPublished: true,
      priority: 78,
      publishedAt: new Date(),
      bookingCityId: '-2167973',
    },
    {
      city: 'Vienna',
      country: 'Austria',
      countryCode: 'AT',
      airportId: 'VIE',
      slug: 'vienna-imperial-elegance',
      title: 'Vienna Imperial Elegance',
      shortDescription: 'Discover imperial palaces and coffee culture',
      longDescription: 'Vienna is a city of imperial grandeur, classical music, and elegant coffee houses. Visit Schönbrunn Palace, attend a concert, and enjoy Sachertorte in a traditional café.',
      basePriceEur: 16000, // €160
      minDurationDays: 2,
      maxDurationDays: 4,
      tripTypes: ['city-break', 'romantic', 'culture'],
      tags: ['history', 'music', 'coffee', 'palaces'],
      seasonality: ['spring', 'summer', 'fall', 'winter'],
      isFeatured: false,
      isPublished: true,
      priority: 72,
      publishedAt: new Date(),
      bookingCityId: '-1995499',
    },
    {
      city: 'Athens',
      country: 'Greece',
      countryCode: 'GR',
      airportId: 'ATH',
      slug: 'athens-ancient-wonders',
      title: 'Athens: Ancient Wonders',
      shortDescription: 'Walk among ancient ruins and modern Greek life',
      longDescription: 'Athens combines ancient history with vibrant modern culture. Explore the Acropolis, wander through Plaka, and enjoy delicious Greek cuisine with views of the Parthenon.',
      basePriceEur: 17000, // €170
      minDurationDays: 3,
      maxDurationDays: 4,
      tripTypes: ['city-break', 'culture', 'history'],
      tags: ['ancient-ruins', 'food', 'history', 'mythology'],
      seasonality: ['spring', 'fall', 'winter'],
      isFeatured: false,
      isPublished: true,
      priority: 76,
      publishedAt: new Date(),
      bookingCityId: '-814876',
    },
  ];

  for (const dest of sampleDestinations) {
    await prisma.destination.upsert({
      where: { slug: dest.slug },
      update: {},
      create: dest,
    });
  }

  console.log(`✅ Seeded ${sampleDestinations.length} destinations`);
}

async function seedBadges() {
  console.log('🏅 Seeding badges...');

  const badges = [
    {
      code: 'first_booking',
      name: 'First Trip',
      description: 'Made your first booking with TravelTomorrow',
    },
    {
      code: 'early_bird',
      name: 'Early Bird',
      description: 'Booked 30+ days in advance',
    },
    {
      code: 'weekend_warrior',
      name: 'Weekend Warrior',
      description: 'Completed 5 weekend trips',
    },
    {
      code: 'lucky_spinner',
      name: 'Lucky Spinner',
      description: 'Spun the wheel 10 times',
    },
    {
      code: 'deal_hunter',
      name: 'Deal Hunter',
      description: 'Booked a "Good Price" deal',
    },
    {
      code: 'spontaneous',
      name: 'Spontaneous Traveler',
      description: 'Booked within 48 hours of departure',
    },
    {
      code: 'explorer',
      name: 'Explorer',
      description: 'Visited 10 different cities',
    },
    {
      code: 'price_alert_pro',
      name: 'Price Alert Pro',
      description: 'Set up 5 price alerts',
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {},
      create: badge,
    });
  }

  console.log(`✅ Seeded ${badges.length} badges`);
}

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('');

  try {
    await seedAirports();
    await seedDestinations();
    await seedBadges();

    console.log('');
    console.log('✅ Database seed complete!');
    console.log('');
    console.log('Summary:');
    console.log(`  - Airports: ${await prisma.airport.count()}`);
    console.log(`  - Destinations: ${await prisma.destination.count()}`);
    console.log(`  - Badges: ${await prisma.badge.count()}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
