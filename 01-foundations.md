# Stage 1: Foundations

## Overview
Build the core infrastructure layer including database schema, API foundation, authentication system, airport/geolocation data, and basic Drupal CMS setup.

## Objectives
- Design and implement database schema
- Set up API server with authentication
- Populate airports and geolocation data
- Configure Drupal CMS foundation
- Establish shared TypeScript types
- Create seed data for development

---

## 1. Database Schema Design

### Database Migration Tool Setup

**packages/database/package.json:**
```json
{
  "name": "@traveltomorrow/database",
  "scripts": {
    "migrate:dev": "prisma migrate dev",
    "migrate:prod": "prisma migrate deploy",
    "migrate:test": "DATABASE_URL=$TEST_DATABASE_URL prisma migrate deploy",
    "seed": "ts-node src/seed.ts",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.9.0"
  },
  "devDependencies": {
    "prisma": "^5.9.0",
    "ts-node": "^10.9.2"
  }
}
```

### Prisma Schema

**packages/database/prisma/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/client"
}

// ============================================
// USER & AUTHENTICATION
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  emailVerified Boolean   @default(false)
  firstName     String?
  lastName      String?
  phone         String?

  // OAuth fields
  provider      String?   // google, facebook, apple
  providerId    String?

  // Preferences
  homeAirportId String?
  homeAirport   Airport?  @relation(fields: [homeAirportId], references: [iataCode])
  currency      String    @default("EUR")
  locale        String    @default("en")

  // Gamification
  loyaltyPoints Int       @default(0)
  badges        Badge[]

  role          UserRole  @default(USER)
  status        UserStatus @default(ACTIVE)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relations
  bookings      Booking[]
  alerts        PriceAlert[]
  sessions      Session[]
  preferences   UserPreference[]
  wheelSpins    WheelSpin[]

  @@index([email])
  @@index([homeAirportId])
}

enum UserRole {
  USER
  EDITOR
  PRICING_MANAGER
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token        String   @unique
  refreshToken String?  @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  ipAddress    String?
  userAgent    String?

  @@index([userId])
  @@index([token])
}

model UserPreference {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  key       String  // e.g., "maxFlightDuration", "preferredTripType"
  value     String

  @@unique([userId, key])
  @@index([userId])
}

// ============================================
// AIRPORTS & LOCATIONS
// ============================================

model Airport {
  iataCode    String   @id // BRU, CDG, AMS
  icaoCode    String?
  name        String
  city        String
  country     String
  countryCode String   // BE, FR, NL
  latitude    Float
  longitude   Float
  timezone    String

  // Features
  isActive    Boolean  @default(true)
  isPopular   Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  users               User[]
  departureOffers     Offer[]         @relation("DepartureAirport")
  arrivalOffers       Offer[]         @relation("ArrivalAirport")
  destinations        Destination[]   @relation("DestinationAirport")
  nearbyDestinations  Destination[]   @relation("NearbyAirports")

  @@index([countryCode])
  @@index([isPopular, isActive])
  @@index([latitude, longitude])
}

// ============================================
// DESTINATIONS
// ============================================

model Destination {
  id              String   @id @default(cuid())

  // Basic info
  city            String
  country         String
  countryCode     String
  airportId       String
  airport         Airport  @relation("DestinationAirport", fields: [airportId], references: [iataCode])

  // Editorial content
  slug            String   @unique
  title           String
  shortDescription String?
  longDescription  String?  @db.Text
  itineraryJson    Json?    // Structured itinerary data

  // Media
  heroImageUrl     String?
  galleryImages    String[] // Array of image URLs
  videoUrl         String?

  // Pricing & features
  basePriceEur     Int?     // Base price in EUR cents
  minDurationDays  Int      @default(2)
  maxDurationDays  Int      @default(4)

  // Classification
  tripTypes        String[] // ["romantic", "outdoors", "city-break", "beach"]
  tags             String[] // ["weekend", "culture", "nightlife"]
  seasonality      String[] // ["spring", "summer", "fall", "winter"]

  // Admin controls
  isFeatured       Boolean  @default(false)
  isPublished      Boolean  @default(false)
  publishedAt      DateTime?
  priority         Int      @default(50) // For wheel weighting

  // SEO
  metaTitle        String?
  metaDescription  String?
  canonicalUrl     String?

  // Affiliate links
  bookingCityId    String?  // Booking.com city ID

  // Analytics
  viewCount        Int      @default(0)
  bookingCount     Int      @default(0)
  wheelWinCount    Int      @default(0)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  createdBy        String?
  updatedBy        String?

  // Relations
  nearbyAirports   Airport[] @relation("NearbyAirports")
  offers           Offer[]
  priceHistory     PriceHistory[]
  wheelResults     WheelSpin[]
  bankHolidayPages BankHolidayPage[]

  @@index([slug])
  @@index([airportId])
  @@index([isFeatured, isPublished])
  @@index([countryCode])
}

// ============================================
// OFFERS & PRICING
// ============================================

model Offer {
  id                String   @id @default(cuid())

  // Duffel data
  duffelOfferId     String   @unique
  duffelOfferData   Json     // Full Duffel offer response

  // Route info
  departureAirportId String
  departureAirport   Airport  @relation("DepartureAirport", fields: [departureAirportId], references: [iataCode])
  arrivalAirportId   String
  arrivalAirport     Airport  @relation("ArrivalAirport", fields: [arrivalAirportId], references: [iataCode])

  destinationId      String?
  destination        Destination? @relation(fields: [destinationId], references: [id])

  // Flight details
  outboundDate       DateTime
  returnDate         DateTime?
  isRoundTrip        Boolean
  cabinClass         String   // economy, premium_economy, business, first

  // Pricing
  currency           String
  totalAmount        Int      // In cents
  baseFare           Int      // In cents
  taxesAmount        Int      // In cents

  // Passengers
  adultCount         Int      @default(1)
  childCount         Int      @default(0)
  infantCount        Int      @default(0)

  // Fare conditions
  isRefundable       Boolean  @default(false)
  baggageAllowance   Json?
  fareConditions     Json?

  // Caching
  cachedAt           DateTime @default(now())
  expiresAt          DateTime

  // Price scoring
  priceScore         Int?     // 0-100, higher is better
  priceBadge         PriceBadge? // GOOD, FAIR, POOR

  // Relations
  bookings           Booking[]

  @@index([duffelOfferId])
  @@index([departureAirportId, arrivalAirportId, outboundDate])
  @@index([destinationId])
  @@index([expiresAt])
  @@index([priceScore])
}

enum PriceBadge {
  GOOD
  FAIR
  POOR
}

model PriceHistory {
  id             String      @id @default(cuid())

  routeKey       String      // e.g., "BRU-CDG"
  destinationId  String?
  destination    Destination? @relation(fields: [destinationId], references: [id])

  travelDate     DateTime
  price          Int         // In cents
  currency       String
  source         String      // duffel, manual, competitor

  createdAt      DateTime    @default(now())

  @@index([routeKey, travelDate])
  @@index([destinationId, travelDate])
  @@index([createdAt])
}

// ============================================
// BOOKINGS
// ============================================

model Booking {
  id                String   @id @default(cuid())

  // User
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  // Offer
  offerId           String
  offer             Offer    @relation(fields: [offerId], references: [id])

  // Duffel order
  duffelOrderId     String   @unique
  duffelOrderData   Json

  // Passengers
  passengers        Json     // Array of passenger objects

  // Payment
  paymentIntentId   String?
  paymentStatus     PaymentStatus @default(PENDING)
  totalPaid         Int      // In cents
  currency          String

  // Status
  status            BookingStatus @default(PENDING)
  ticketingStatus   TicketingStatus @default(NOT_ISSUED)

  // Tickets
  tickets           Json?    // Duffel ticket data

  // Extras
  hasLuggage        Boolean  @default(false)
  hasSeatSelection  Boolean  @default(false)
  extrasData        Json?

  // Metadata
  bookingReference  String?  // PNR
  confirmationEmail String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  confirmedAt       DateTime?
  cancelledAt       DateTime?

  @@index([userId])
  @@index([duffelOrderId])
  @@index([status])
  @@index([createdAt])
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  REFUNDED
}

enum TicketingStatus {
  NOT_ISSUED
  ISSUING
  ISSUED
  FAILED
}

// ============================================
// PRICE ALERTS
// ============================================

model PriceAlert {
  id              String   @id @default(cuid())

  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Alert target
  routeKey        String?  // e.g., "BRU-BCN"
  destinationId   String?

  // Criteria
  departureDate   DateTime?
  returnDate      DateTime?
  thresholdPrice  Int?     // In cents - trigger if below
  thresholdPercent Int?    // Trigger if % drop

  // Status
  isActive        Boolean  @default(true)
  lastNotifiedAt  DateTime?
  notificationCount Int    @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, isActive])
  @@index([routeKey])
  @@index([destinationId])
}

// ============================================
// WHEEL & GAMIFICATION
// ============================================

model WheelSpin {
  id              String      @id @default(cuid())

  userId          String?
  user            User?       @relation(fields: [userId], references: [id])

  // Input
  departureAirportId String
  preferences     Json?       // User preferences for this spin

  // Result
  resultDestinationId String?
  resultDestination   Destination? @relation(fields: [resultDestinationId], references: [id])
  offersShown     Json        // Array of offer summaries shown

  // Actions
  didClickOffer   Boolean     @default(false)
  didBook         Boolean     @default(false)

  // Metadata
  sessionId       String?
  ipAddress       String?

  createdAt       DateTime    @default(now())

  @@index([userId])
  @@index([resultDestinationId])
  @@index([createdAt])
}

model Badge {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String
  iconUrl     String?

  users       User[]

  createdAt   DateTime @default(now())
}

// ============================================
// BANK HOLIDAYS & EDITORIAL
// ============================================

model BankHolidayPage {
  id              String        @id @default(cuid())

  slug            String        @unique
  countryCode     String

  // Holiday info
  holidayName     String
  holidayDate     DateTime
  year            Int

  // Content
  title           String
  content         String        @db.Text
  metaDescription String?

  // Featured destinations
  destinations    Destination[]

  isPublished     Boolean       @default(false)
  publishedAt     DateTime?

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([slug])
  @@index([countryCode, year])
}

// ============================================
// AFFILIATE TRACKING
// ============================================

model AffiliateClick {
  id              String   @id @default(cuid())

  userId          String?
  destinationId   String?

  partner         String   // booking, expedia, etc.
  affiliateId     String
  clickUrl        String   @db.Text

  // Tracking
  sessionId       String?
  ipAddress       String?
  userAgent       String?
  referrer        String?

  createdAt       DateTime @default(now())

  @@index([partner, createdAt])
  @@index([destinationId])
}

model AffiliateConversion {
  id              String   @id @default(cuid())

  clickId         String?
  partner         String

  bookingValue    Int      // In cents
  commission      Int      // In cents
  currency        String

  conversionDate  DateTime
  createdAt       DateTime @default(now())

  @@index([partner, conversionDate])
}

// ============================================
// ADMIN & AUDIT
// ============================================

model AdminAction {
  id          String   @id @default(cuid())

  userId      String
  action      String   // e.g., "destination.update", "price.override"
  entityType  String   // e.g., "destination", "user", "booking"
  entityId    String

  changeData  Json?    // Old vs new values

  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
  @@index([entityType, entityId])
}

// ============================================
// EMAIL CAMPAIGNS
// ============================================

model EmailCampaign {
  id              String   @id @default(cuid())

  name            String
  subject         String
  content         String   @db.Text

  // Targeting
  targetSegment   String?  // e.g., "all", "price-alert-subscribers"
  targetCountry   String?

  // Scheduling
  status          CampaignStatus @default(DRAFT)
  scheduledAt     DateTime?
  sentAt          DateTime?

  // Stats
  recipientCount  Int      @default(0)
  openCount       Int      @default(0)
  clickCount      Int      @default(0)
  conversionCount Int      @default(0)

  createdAt       DateTime @default(now())
  createdBy       String?

  @@index([status, scheduledAt])
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  CANCELLED
}
```

### Database Seed Data

**packages/database/src/seed.ts:**
```typescript
import { PrismaClient } from './generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedAirports() {
  console.log('Seeding airports...');

  // Load airports from CSV/JSON (airports.json should contain IATA data)
  const airportsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data/airports.json'), 'utf-8')
  );

  for (const airport of airportsData.slice(0, 500)) { // Top 500 airports
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
  console.log('Seeding sample destinations...');

  const sampleDestinations = [
    {
      city: 'Barcelona',
      country: 'Spain',
      countryCode: 'ES',
      airportId: 'BCN',
      slug: 'barcelona-weekend-break',
      title: 'Barcelona Weekend Break',
      shortDescription: 'Experience Gaudí, beaches, and tapas in vibrant Barcelona',
      basePriceEur: 15000, // €150
      tripTypes: ['city-break', 'romantic', 'culture'],
      isFeatured: true,
      isPublished: true,
    },
    {
      city: 'Porto',
      country: 'Portugal',
      countryCode: 'PT',
      airportId: 'OPO',
      slug: 'porto-wine-weekend',
      title: 'Porto Wine & Culture Weekend',
      shortDescription: 'Explore historic Porto and taste world-famous port wine',
      basePriceEur: 12000, // €120
      tripTypes: ['city-break', 'culture', 'food'],
      isFeatured: true,
      isPublished: true,
    },
    // Add more...
  ];

  for (const dest of sampleDestinations) {
    await prisma.destination.create({
      data: dest,
    });
  }

  console.log(`✅ Seeded ${sampleDestinations.length} destinations`);
}

async function seedBadges() {
  console.log('Seeding badges...');

  const badges = [
    { code: 'first_booking', name: 'First Trip', description: 'Made your first booking' },
    { code: 'early_bird', name: 'Early Bird', description: 'Booked 30+ days in advance' },
    { code: 'weekend_warrior', name: 'Weekend Warrior', description: 'Completed 5 weekend trips' },
    { code: 'lucky_spinner', name: 'Lucky Spinner', description: 'Spun the wheel 10 times' },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {},
      create: badge,
    });
  }

  console.log('✅ Seeded badges');
}

async function main() {
  console.log('Starting database seed...');

  await seedAirports();
  await seedDestinations();
  await seedBadges();

  console.log('✅ Database seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 2. API Server Foundation

### API Server Structure
```
packages/api/
├── src/
│   ├── server.ts              # Express app setup
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── secrets.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimit.ts
│   │   └── validation.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── health.ts
│   │   ├── users.ts
│   │   └── airports.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   └── geolocation.service.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   └── password.ts
│   └── types/
│       └── express.d.ts
├── __tests__/
└── package.json
```

### Express Server Setup

**packages/api/src/server.ts:**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '@traveltomorrow/shared/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import airportRoutes from './routes/airports';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:6000'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Rate limiting
app.use(rateLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/airports', airportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`🚀 API server running on port ${PORT}`);
});

export default app;
```

### Authentication Middleware

**packages/api/src/middleware/auth.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/jwt';
import { prisma } from '../config/database';
import { logger } from '@traveltomorrow/shared/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify session
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    if (session.user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
```

### JWT Utilities

**packages/api/src/utils/jwt.ts:**
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

export function signJWT(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

export function verifyJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateRefreshToken(): string {
  return jwt.sign({}, JWT_SECRET, {
    expiresIn: '30d',
  });
}
```

### Password Hashing

**packages/api/src/utils/password.ts:**
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## 3. Authentication Routes

**packages/api/src/routes/auth.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signJWT, generateRefreshToken } from '../utils/jwt';
import { sendEmail } from '../services/email.service';
import { body, validationResult } from 'express-validator';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    try {
      // Check if user exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Create user
      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
        },
      });

      // Create session
      const token = signJWT({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      // Send welcome email
      await sendEmail({
        to: user.email,
        subject: 'Welcome to TravelTomorrow!',
        template: 'welcome',
        data: { firstName: user.firstName },
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await comparePassword(password, user.passwordHash);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Account suspended' });
      }

      // Create session
      const token = signJWT({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          refreshToken,
          expiresAt,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Logout
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.substring(7);

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  res.json({ message: 'Logged out' });
});

export default router;
```

---

## 4. Geolocation & Airport Service

**packages/api/src/services/geolocation.service.ts:**
```typescript
import { prisma } from '../config/database';
import axios from 'axios';

interface Location {
  latitude: number;
  longitude: number;
}

// Haversine distance formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function findNearestAirports(
  location: Location,
  limit: number = 5
): Promise<any[]> {
  const airports = await prisma.airport.findMany({
    where: { isActive: true },
  });

  const airportsWithDistance = airports.map(airport => ({
    ...airport,
    distance: calculateDistance(
      location.latitude,
      location.longitude,
      airport.latitude,
      airport.longitude
    ),
  }));

  return airportsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export async function getLocationFromIP(ip: string): Promise<Location | null> {
  try {
    // Use IP geolocation service (ipapi.co, ipstack, etc.)
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);

    return {
      latitude: response.data.latitude,
      longitude: response.data.longitude,
    };
  } catch (error) {
    console.error('IP geolocation error:', error);
    return null;
  }
}
```

### Airports API Route

**packages/api/src/routes/airports.ts:**
```typescript
import { Router } from 'express';
import { prisma } from '../config/database';
import { findNearestAirports, getLocationFromIP } from '../services/geolocation.service';

const router = Router();

// Get all active airports
router.get('/', async (req, res) => {
  const { country, popular } = req.query;

  const airports = await prisma.airport.findMany({
    where: {
      isActive: true,
      ...(country && { countryCode: country as string }),
      ...(popular === 'true' && { isPopular: true }),
    },
    orderBy: { city: 'asc' },
  });

  res.json(airports);
});

// Get nearest airports
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lon, limit } = req.query;

    let location;

    if (lat && lon) {
      location = {
        latitude: parseFloat(lat as string),
        longitude: parseFloat(lon as string),
      };
    } else {
      // Fallback to IP geolocation
      const ip = req.ip || req.headers['x-forwarded-for'] as string;
      location = await getLocationFromIP(ip);
    }

    if (!location) {
      return res.status(400).json({ error: 'Could not determine location' });
    }

    const airports = await findNearestAirports(
      location,
      limit ? parseInt(limit as string) : 5
    );

    res.json(airports);
  } catch (error) {
    console.error('Nearest airports error:', error);
    res.status(500).json({ error: 'Failed to find nearest airports' });
  }
});

// Get airport by IATA code
router.get('/:iataCode', async (req, res) => {
  const airport = await prisma.airport.findUnique({
    where: { iataCode: req.params.iataCode.toUpperCase() },
  });

  if (!airport) {
    return res.status(404).json({ error: 'Airport not found' });
  }

  res.json(airport);
});

export default router;
```

---

## 5. Shared TypeScript Types

**packages/shared/src/types/index.ts:**
```typescript
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  homeAirportId?: string;
}

export enum UserRole {
  USER = 'USER',
  EDITOR = 'EDITOR',
  PRICING_MANAGER = 'PRICING_MANAGER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface Destination {
  id: string;
  city: string;
  country: string;
  slug: string;
  title: string;
  shortDescription?: string;
  heroImageUrl?: string;
  basePriceEur?: number;
  tripTypes: string[];
  isFeatured: boolean;
  isPublished: boolean;
}

export interface Offer {
  id: string;
  duffelOfferId: string;
  departureAirportId: string;
  arrivalAirportId: string;
  outboundDate: string;
  returnDate?: string;
  currency: string;
  totalAmount: number;
  priceScore?: number;
  priceBadge?: 'GOOD' | 'FAIR' | 'POOR';
}

export interface PriceAlert {
  id: string;
  userId: string;
  routeKey?: string;
  destinationId?: string;
  thresholdPrice?: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  offerId: string;
  duffelOrderId: string;
  status: BookingStatus;
  totalPaid: number;
  currency: string;
  bookingReference?: string;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
```

---

## 6. Drupal CMS Setup

### Drupal Installation

**packages/drupal/Dockerfile:**
```dockerfile
FROM drupal:10-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libpq-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_pgsql

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock ./

# Install Drupal modules
RUN composer install --no-dev --optimize-autoloader

# Copy custom modules and themes
COPY modules/custom /var/www/html/modules/custom
COPY themes/custom /var/www/html/themes/custom

# Set permissions
RUN chown -R www-data:www-data /var/www/html
```

### Composer Dependencies

**packages/drupal/composer.json:**
```json
{
  "name": "traveltomorrow/drupal",
  "require": {
    "drupal/core": "^10.0",
    "drupal/admin_toolbar": "^3.4",
    "drupal/metatag": "^2.0",
    "drupal/pathauto": "^1.12",
    "drupal/redirect": "^1.9",
    "drupal/schema_metatag": "^3.0",
    "drupal/jsonapi_extras": "^3.24",
    "drupal/simple_sitemap": "^4.1",
    "drupal/media_entity": "^2.0"
  }
}
```

### Drupal Content Types (via Drush)

**packages/drupal/config/install-content-types.sh:**
```bash
#!/bin/bash

# Install required modules
drush en -y pathauto metatag schema_metatag jsonapi_extras simple_sitemap media

# Create "Destination" content type (will be detailed in Stage 3)
drush php-eval "
  \$type = \Drupal\node\Entity\NodeType::create([
    'type' => 'destination',
    'name' => 'Destination',
  ]);
  \$type->save();
"

echo "Content types installed"
```

---

## 7. Testing

### API Unit Tests

**packages/api/__tests__/auth.test.ts:**
```typescript
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/database';

describe('Authentication', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password456',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });
});
```

---

## Deliverables

- [ ] Database schema designed and migrated
- [ ] Airports data seeded (top 500+ airports)
- [ ] Sample destinations created
- [ ] API server running with authentication
- [ ] JWT-based session management
- [ ] Geolocation service working
- [ ] Nearest airport detection functional
- [ ] Drupal 10 installed and configured
- [ ] Shared TypeScript types package
- [ ] Unit tests for auth endpoints (>80% coverage)
- [ ] API documentation (Swagger/OpenAPI)

## Success Criteria

1. ✅ Database migrations run successfully
2. ✅ API server responds to health checks
3. ✅ User registration and login work
4. ✅ Nearest airport endpoint returns results
5. ✅ Drupal admin accessible
6. ✅ All tests pass

## Timeline

**Estimated Duration:** 1-2 weeks

## Dependencies

- Stage 0 (Project Setup) completed
- PostgreSQL and Redis running
- Duffel test API key available

---

**Next Stage:** [02-wheel-mvp.md](./02-wheel-mvp.md)
