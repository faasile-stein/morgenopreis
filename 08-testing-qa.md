# Stage 8: Testing & QA Strategy

## Overview
Comprehensive testing strategy covering unit tests, integration tests, E2E tests, performance testing, accessibility, and security testing.

## Objectives
- Achieve >80% code coverage
- Implement E2E testing for critical flows
- Set up performance monitoring
- Conduct accessibility audits
- Perform security testing
- Establish testing CI/CD pipeline

---

## 1. Testing Infrastructure

### Jest Configuration (Shared)

**jest.config.js:**
```javascript
module.exports = {
  projects: [
    '<rootDir>/packages/api',
    '<rootDir>/packages/web',
    '<rootDir>/packages/shared',
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.{ts,tsx}',
    '!packages/*/src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
  ],
};
```

### Testing Utilities

**packages/shared/src/test-utils.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let prisma: PrismaClient;

export async function setupTestDatabase() {
  // Set test database URL
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  prisma = new PrismaClient();

  return prisma;
}

export async function cleanupTestDatabase() {
  if (prisma) {
    // Clean all tables
    await prisma.$transaction([
      prisma.booking.deleteMany(),
      prisma.offer.deleteMany(),
      prisma.wheelSpin.deleteMany(),
      prisma.priceAlert.deleteMany(),
      prisma.priceHistory.deleteMany(),
      prisma.destination.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    await prisma.$disconnect();
  }
}

export function createMockUser(overrides = {}) {
  return {
    email: 'test@example.com',
    passwordHash: '$2b$12$mockhashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    status: 'ACTIVE',
    ...overrides,
  };
}

export function createMockDestination(overrides = {}) {
  return {
    city: 'Barcelona',
    country: 'Spain',
    countryCode: 'ES',
    airportId: 'BCN',
    slug: 'barcelona-test',
    title: 'Barcelona Test',
    isPublished: true,
    ...overrides,
  };
}

export function createMockOffer(overrides = {}) {
  return {
    duffelOfferId: 'off_mock123',
    duffelOfferData: {},
    departureAirportId: 'BRU',
    arrivalAirportId: 'BCN',
    outboundDate: new Date('2024-06-01'),
    returnDate: new Date('2024-06-03'),
    isRoundTrip: true,
    cabinClass: 'economy',
    currency: 'EUR',
    totalAmount: 15000,
    baseFare: 12000,
    taxesAmount: 3000,
    adultCount: 1,
    isRefundable: false,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    ...overrides,
  };
}
```

---

## 2. Unit Testing

### API Unit Tests

**packages/api/__tests__/services/price-history.test.ts:**
```typescript
import { priceHistoryService } from '../../src/services/price-history.service';
import { setupTestDatabase, cleanupTestDatabase } from '@traveltomorrow/shared/test-utils';

describe('PriceHistoryService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('getPriceStats', () => {
    it('should calculate correct statistics', async () => {
      // Seed price history
      const routeKey = 'BRU-BCN';
      const prices = [10000, 12000, 15000, 18000, 20000];

      for (const price of prices) {
        await priceHistoryService.recordPrice({
          routeKey,
          travelDate: new Date('2024-06-01'),
          price,
          currency: 'EUR',
          source: 'test',
        });
      }

      const stats = await priceHistoryService.getPriceStats(routeKey, 90);

      expect(stats).toBeDefined();
      expect(stats!.min).toBe(10000);
      expect(stats!.max).toBe(20000);
      expect(stats!.avg).toBe(15000);
    });
  });

  describe('calculatePriceScore', () => {
    it('should return high score for low price', () => {
      const stats = { min: 10000, max: 20000, avg: 15000 };
      const score = priceHistoryService.calculatePriceScore(11000, stats);

      expect(score).toBeGreaterThan(70); // Should be GOOD
    });

    it('should return low score for high price', () => {
      const stats = { min: 10000, max: 20000, avg: 15000 };
      const score = priceHistoryService.calculatePriceScore(19000, stats);

      expect(score).toBeLessThan(30); // Should be POOR
    });
  });

  describe('getPriceBadge', () => {
    it('should return correct badges', () => {
      expect(priceHistoryService.getPriceBadge(80)).toBe('GOOD');
      expect(priceHistoryService.getPriceBadge(50)).toBe('FAIR');
      expect(priceHistoryService.getPriceBadge(30)).toBe('POOR');
    });
  });
});
```

**packages/api/__tests__/routes/wheel.test.ts:**
```typescript
import request from 'supertest';
import app from '../../src/server';
import { setupTestDatabase, cleanupTestDatabase, createMockDestination } from '@traveltomorrow/shared/test-utils';
import { prisma } from '../../src/config/database';

describe('Wheel API', () => {
  beforeAll(async () => {
    await setupTestDatabase();

    // Seed test data
    await prisma.airport.create({
      data: {
        iataCode: 'BRU',
        name: 'Brussels Airport',
        city: 'Brussels',
        country: 'Belgium',
        countryCode: 'BE',
        latitude: 50.9,
        longitude: 4.48,
        timezone: 'Europe/Brussels',
      },
    });

    await prisma.destination.create({
      data: createMockDestination(),
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/wheel/spin', () => {
    it('should return offers for wheel spin', async () => {
      const destination = await prisma.destination.findFirst();

      const response = await request(app)
        .post('/api/wheel/spin')
        .send({
          destinationId: destination!.id,
          userLocation: { latitude: 50.85, longitude: 4.35 },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('destination');
      expect(response.body).toHaveProperty('offers');
      expect(response.body.offers).toBeInstanceOf(Array);
    });

    it('should log wheel spin', async () => {
      const destination = await prisma.destination.findFirst();

      await request(app)
        .post('/api/wheel/spin')
        .send({ destinationId: destination!.id });

      const spinCount = await prisma.wheelSpin.count();
      expect(spinCount).toBeGreaterThan(0);
    });
  });
});
```

---

## 3. Integration Testing

**packages/api/__tests__/integration/booking-flow.test.ts:**
```typescript
import request from 'supertest';
import app from '../../src/server';
import { setupTestDatabase, cleanupTestDatabase } from '@traveltomorrow/shared/test-utils';
import { prisma } from '../../src/config/database';

describe('Booking Flow Integration', () => {
  let authToken: string;
  let userId: string;
  let offerId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    // Seed data
    await prisma.airport.createMany({
      data: [
        {
          iataCode: 'BRU',
          name: 'Brussels',
          city: 'Brussels',
          country: 'Belgium',
          countryCode: 'BE',
          latitude: 50.9,
          longitude: 4.48,
          timezone: 'Europe/Brussels',
        },
        {
          iataCode: 'BCN',
          name: 'Barcelona',
          city: 'Barcelona',
          country: 'Spain',
          countryCode: 'ES',
          latitude: 41.3,
          longitude: 2.08,
          timezone: 'Europe/Madrid',
        },
      ],
    });

    // Register user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        duffelOfferId: 'off_test123',
        duffelOfferData: {},
        departureAirportId: 'BRU',
        arrivalAirportId: 'BCN',
        outboundDate: new Date('2024-06-01'),
        returnDate: new Date('2024-06-03'),
        isRoundTrip: true,
        cabinClass: 'economy',
        currency: 'EUR',
        totalAmount: 15000,
        baseFare: 12000,
        taxesAmount: 3000,
        adultCount: 1,
        isRefundable: false,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    offerId = offer.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should complete full booking flow', async () => {
    // Step 1: Create booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        offerId,
        passengers: [
          {
            type: 'adult',
            title: 'Mr',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
          },
        ],
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.booking).toBeDefined();

    const bookingId = bookingRes.body.booking.id;

    // Step 2: Confirm booking
    const confirmRes = await request(app)
      .post(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.booking.status).toBe('CONFIRMED');

    // Step 3: Verify booking in database
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    expect(booking).toBeDefined();
    expect(booking!.status).toBe('CONFIRMED');
  });
});
```

---

## 4. E2E Testing (Playwright)

**packages/web/__tests__/e2e/wheel-booking.spec.ts:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Wheel to Booking Flow', () => {
  test('should complete wheel spin and booking', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:6000');

    // Wait for wheel to load
    await expect(page.locator('text=Where will you go?')).toBeVisible();

    // Click spin button
    await page.click('button:has-text("SPIN!")');

    // Wait for spin animation to complete
    await page.waitForTimeout(5000);

    // Check for offers
    await expect(page.locator('[data-testid="offer-card"]')).toBeVisible();

    // Click first offer
    await page.click('[data-testid="offer-card"]:first-child >> text=Book Now');

    // Should navigate to checkout
    await expect(page).toHaveURL(/.*checkout.*/);

    // Fill passenger details
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="dateOfBirth"]', '1990-01-01');

    // Fill payment details (test mode)
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.fill('[name="cardExpiry"]', '12/25');
    await page.fill('[name="cardCvc"]', '123');

    // Submit booking
    await page.click('button:has-text("Complete Booking")');

    // Wait for confirmation
    await expect(page.locator('text=Booking Confirmed')).toBeVisible({ timeout: 10000 });
  });
});
```

**playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './packages/web/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:6000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:6000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 5. Performance Testing

**packages/api/__tests__/performance/load-test.ts:**
```typescript
import autocannon from 'autocannon';

async function runLoadTest() {
  const result = await autocannon({
    url: 'http://localhost:6001',
    connections: 100,
    duration: 30,
    pipelining: 1,
    requests: [
      {
        method: 'GET',
        path: '/health',
      },
      {
        method: 'GET',
        path: '/api/destinations/featured',
      },
      {
        method: 'POST',
        path: '/api/wheel/spin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          destinationId: 'test-dest-id',
        }),
      },
    ],
  });

  console.log('Load Test Results:');
  console.log(`Requests per second: ${result.requests.average}`);
  console.log(`Latency (avg): ${result.latency.mean}ms`);
  console.log(`Errors: ${result.errors}`);

  // Assert performance thresholds
  if (result.latency.mean > 500) {
    throw new Error('Average latency exceeds 500ms');
  }

  if (result.requests.average < 100) {
    throw new Error('Requests per second below 100');
  }
}

runLoadTest().catch(console.error);
```

---

## 6. Accessibility Testing

**packages/web/__tests__/accessibility/a11y.test.ts:**
```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('home page should be accessible', async ({ page }) => {
    await page.goto('http://localhost:6000');
    await injectAxe(page);

    const violations = await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });

    expect(violations).toHaveLength(0);
  });

  test('destination page should be accessible', async ({ page }) => {
    await page.goto('http://localhost:6000/destinations/barcelona');
    await injectAxe(page);

    const violations = await checkA11y(page);
    expect(violations).toHaveLength(0);
  });
});
```

---

## 7. Security Testing

**packages/api/__tests__/security/sql-injection.test.ts:**
```typescript
import request from 'supertest';
import app from '../../src/server';

describe('SQL Injection Protection', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousInput = "'; DROP TABLE users; --";

    const response = await request(app)
      .get('/api/destinations')
      .query({ search: maliciousInput });

    expect(response.status).not.toBe(500);
    // Should either return empty results or sanitized results
  });
});
```

**packages/api/__tests__/security/xss.test.ts:**
```typescript
import request from 'supertest';
import app from '../../src/server';

describe('XSS Protection', () => {
  it('should sanitize user input', async () => {
    const xssPayload = '<script>alert("XSS")</script>';

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: xssPayload,
      });

    if (response.status === 201) {
      expect(response.body.user.firstName).not.toContain('<script>');
    }
  });
});
```

---

## 8. Testing CI/CD Integration

**.github/workflows/test.yml:**
```yaml
name: Tests

on:
  push:
    branches: [main, develop, 'claude/**']
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate:test
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Run unit tests
        run: npm run test
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build app
        run: npm run build --workspace=packages/web

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: http://localhost:6000
          uploadArtifacts: true
          budgetPath: ./packages/web/lighthouse-budget.json
```

---

## 9. Test Coverage Requirements

### Coverage Thresholds

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "packages/api/src/services/**/*.ts": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

---

## 10. Testing Checklist

### Pre-Release Testing Checklist

```markdown
## Functional Testing
- [ ] User registration and login
- [ ] Wheel spin functionality
- [ ] Offer display and selection
- [ ] Booking creation
- [ ] Payment processing
- [ ] Email confirmations
- [ ] Price alerts creation
- [ ] Alert notifications
- [ ] Admin destination management
- [ ] Admin booking management

## Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Performance Testing
- [ ] Page load times < 2s
- [ ] API response times < 500ms
- [ ] Lighthouse score > 90
- [ ] Load test: 100 concurrent users

## Accessibility Testing
- [ ] WCAG 2.1 AA compliance
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Color contrast ratios

## Security Testing
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Authentication security
- [ ] API rate limiting
- [ ] Secrets not exposed

## Mobile App Testing
- [ ] iOS app functionality
- [ ] Android app functionality
- [ ] Push notifications
- [ ] Offline handling
- [ ] App store compliance
```

---

## Deliverables

- [ ] Unit tests with >80% coverage
- [ ] Integration tests for critical flows
- [ ] E2E tests with Playwright
- [ ] Performance testing suite
- [ ] Accessibility testing
- [ ] Security testing
- [ ] CI/CD test pipeline
- [ ] Test documentation

## Success Criteria

1. ✅ Code coverage >80%
2. ✅ All E2E tests passing
3. ✅ Performance meets thresholds
4. ✅ WCAG 2.1 AA compliant
5. ✅ Security tests pass
6. ✅ CI pipeline runs all tests
7. ✅ Test results documented

## Timeline

**Estimated Duration:** Ongoing (2-3 weeks for initial setup)

---

**Next Stage:** [09-deployment-cicd.md](./09-deployment-cicd.md)
