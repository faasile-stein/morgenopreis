# Stage 0: Project Setup & Infrastructure

## Overview
Establish project foundation, repository structure, development environment, and CI/CD pipelines for the TravelTomorrow/MorgenOpreis.be platform.

## Objectives
- Set up monorepo structure for web, API, mobile, and CMS
- Configure development environments and tooling
- Establish CI/CD pipelines
- Set up infrastructure provisioning
- Configure third-party integrations (Duffel, Booking.com)

---

## 1. Repository Structure

### Monorepo Layout
```
morgenopreis/
├── .github/
│   └── workflows/
│       ├── api-ci.yml
│       ├── web-ci.yml
│       ├── mobile-ci.yml
│       ├── laravel-ci.yml
│       └── deploy.yml
├── packages/
│   ├── api/                    # Node.js/Express API server
│   ├── web/                    # Next.js web app (wheel UI)
│   ├── mobile/                 # React Native/Expo app
│   ├── laravel/                # Laravel CMS
│   ├── shared/                 # Shared TypeScript types & utilities
│   └── database/               # Database migrations & schemas
├── infrastructure/
│   ├── terraform/              # Infrastructure as Code
│   ├── docker/                 # Docker configurations
│   └── kubernetes/             # K8s manifests (if using)
├── docs/
│   ├── api/                    # API documentation
│   ├── architecture/           # Architecture diagrams
│   └── runbooks/              # Operational runbooks
├── scripts/
│   ├── setup-dev.sh
│   ├── seed-data.sh
│   └── check-integrations.sh
├── .gitignore
├── .nvmrc
├── package.json                # Root package.json for workspace
├── tsconfig.json              # Base TypeScript config
└── README.md
```

### Technology Stack

**Backend API:**
- Node.js 20.x LTS
- Express.js or Fastify
- TypeScript
- PostgreSQL 15+
- Redis (caching & sessions)
- Prisma or TypeORM

**Web Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Framer Motion (wheel animation)
- React Query (data fetching)

**Mobile:**
- Expo SDK 50+
- React Native
- TypeScript
- React Navigation
- Expo Notifications

**CMS:**
- Laravel 11+
- PHP 8.3+
- Composer
- JSON-LD packages
- Laravel Media Library

**DevOps:**
- Docker & Docker Compose
- GitHub Actions
- Terraform (AWS/GCP/Azure)
- PostgreSQL (managed service)
- Redis (managed service)

---

## 2. Development Environment Setup

### Prerequisites Installation Script
```bash
#!/bin/bash
# scripts/setup-dev.sh

echo "Setting up TravelTomorrow development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Install Node.js 20.x"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker"
    exit 1
fi

# Install dependencies
npm install

# Set up environment files
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env
cp packages/mobile/.env.example packages/mobile/.env

# Start local services
docker-compose up -d

# Run migrations
npm run migrate:dev

# Seed data
npm run seed:dev

echo "Setup complete! Run 'npm run dev' to start all services"
```

### Docker Compose for Local Development
```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: traveltomorrow_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

  laravel:
    build: ./packages/laravel
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://dev:devpass@postgres:5432/traveltomorrow_laravel
    ports:
      - "6800:8000"
    volumes:
      - ./packages/laravel:/var/www/html

volumes:
  postgres_data:
  redis_data:
```

### Environment Variables Template

**packages/api/.env.example:**
```env
# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:6001

# Database
DATABASE_URL=postgresql://dev:devpass@localhost:5432/traveltomorrow_dev

# Redis
REDIS_URL=redis://localhost:6379

# Duffel API
DUFFEL_API_KEY=duffel_test_xxxxx
DUFFEL_API_URL=https://api.duffel.com

# Booking.com Affiliate
BOOKING_AFFILIATE_ID=your_affiliate_id
BOOKING_DEEP_LINK_BASE=https://www.booking.com/

# Stripe/Payment
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (SendGrid/AWS SES)
EMAIL_PROVIDER=mailhog
SENDGRID_API_KEY=
EMAIL_FROM=noreply@traveltomorrow.be

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d

# External APIs
GEOLOCATION_API_KEY=
ANALYTICS_KEY=

# Logging
LOG_LEVEL=debug
```

**packages/web/.env.example:**
```env
NEXT_PUBLIC_API_URL=http://localhost:6001
NEXT_PUBLIC_DRUPAL_URL=http://localhost:6080
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
NEXT_PUBLIC_GA_TRACKING_ID=
```

---

## 3. Package Management & Workspaces

### Root package.json
```json
{
  "name": "traveltomorrow",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm:dev:*\"",
    "dev:api": "npm run dev --workspace=packages/api",
    "dev:web": "npm run dev --workspace=packages/web",
    "dev:mobile": "npm run dev --workspace=packages/mobile",

    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "type-check": "npm run type-check --workspaces --if-present",

    "migrate:dev": "npm run migrate:dev --workspace=packages/database",
    "migrate:prod": "npm run migrate:prod --workspace=packages/database",
    "seed:dev": "npm run seed --workspace=packages/database",

    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:reset": "docker-compose down -v && docker-compose up -d",

    "setup": "bash scripts/setup-dev.sh",
    "check:integrations": "bash scripts/check-integrations.sh"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3",
    "prettier": "^3.2.4",
    "eslint": "^8.56.0"
  }
}
```

---

## 4. CI/CD Pipeline Setup

### GitHub Actions - API CI
```yaml
# .github/workflows/api-ci.yml
name: API CI

on:
  push:
    branches: [main, develop, 'claude/**']
    paths:
      - 'packages/api/**'
      - 'packages/shared/**'
      - 'packages/database/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'packages/api/**'
      - 'packages/shared/**'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check --workspace=packages/api

      - name: Lint
        run: npm run lint --workspace=packages/api

      - name: Run migrations
        run: npm run migrate:test --workspace=packages/database
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/test_db

      - name: Run tests
        run: npm run test --workspace=packages/api
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/api/coverage/coverage-final.json
          flags: api

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### GitHub Actions - Web CI
```yaml
# .github/workflows/web-ci.yml
name: Web CI

on:
  push:
    branches: [main, develop, 'claude/**']
    paths:
      - 'packages/web/**'
      - 'packages/shared/**'
  pull_request:
    branches: [main, develop]

jobs:
  test:
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

      - name: Type check
        run: npm run type-check --workspace=packages/web

      - name: Lint
        run: npm run lint --workspace=packages/web

      - name: Build
        run: npm run build --workspace=packages/web
        env:
          NEXT_PUBLIC_API_URL: https://api-staging.traveltomorrow.be

      - name: Run tests
        run: npm run test --workspace=packages/web

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:6000
          budgetPath: ./packages/web/lighthouse-budget.json
          uploadArtifacts: true
```

### GitHub Actions - Mobile CI
```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI

on:
  push:
    branches: [main, develop, 'claude/**']
    paths:
      - 'packages/mobile/**'
      - 'packages/shared/**'

jobs:
  test:
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

      - name: Type check
        run: npm run type-check --workspace=packages/mobile

      - name: Lint
        run: npm run lint --workspace=packages/mobile

      - name: Run tests
        run: npm run test --workspace=packages/mobile

      - name: EAS Build (staging)
        if: github.ref == 'refs/heads/develop'
        run: npx eas-cli build --platform all --non-interactive
        working-directory: packages/mobile
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### GitHub Actions - Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: traveltomorrow-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG ./packages/api
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster traveltomorrow-${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }} \
            --service api \
            --force-new-deployment

  deploy-web:
    runs-on: ubuntu-latest
    environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Deploy to Vercel
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
          else
            vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
          fi
        working-directory: packages/web
```

---

## 5. Infrastructure as Code

### Terraform - Main Configuration
```hcl
# infrastructure/terraform/main.tf
terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket = "traveltomorrow-terraform-state"
    key    = "terraform.tfstate"
    region = "eu-west-1"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "traveltomorrow-${var.environment}"
  cidr = "10.0.0.0/16"

  azs             = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Environment = var.environment
    Project     = "TravelTomorrow"
  }
}

# RDS PostgreSQL
module "rds" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "traveltomorrow-${var.environment}"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "traveltomorrow"
  username = "dbadmin"
  port     = 5432

  multi_az               = var.environment == "production"
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [module.security_group_db.security_group_id]

  backup_retention_period = 7
  skip_final_snapshot     = var.environment != "production"
  deletion_protection     = var.environment == "production"

  tags = {
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "traveltomorrow-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [module.security_group_redis.security_group_id]
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "traveltomorrow-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# S3 for media/assets
resource "aws_s3_bucket" "assets" {
  bucket = "traveltomorrow-${var.environment}-assets"

  tags = {
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# CloudFront for CDN
resource "aws_cloudfront_distribution" "assets" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.id}"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

---

## 6. Code Quality & Standards

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### Git Hooks (Husky)
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Commit Lint Configuration
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code refactoring
        'test',     // Tests
        'chore',    // Maintenance
        'ci',       // CI/CD changes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'web',
        'mobile',
        'drupal',
        'shared',
        'database',
        'infra',
        'ci',
      ],
    ],
  },
};
```

---

## 7. Secrets Management

### AWS Secrets Manager Structure
```json
{
  "traveltomorrow/production": {
    "database_url": "postgresql://...",
    "redis_url": "redis://...",
    "duffel_api_key": "duffel_live_...",
    "stripe_secret_key": "sk_live_...",
    "jwt_secret": "...",
    "sendgrid_api_key": "..."
  },
  "traveltomorrow/staging": {
    "database_url": "postgresql://...",
    "redis_url": "redis://...",
    "duffel_api_key": "duffel_test_...",
    "stripe_secret_key": "sk_test_...",
    "jwt_secret": "...",
    "sendgrid_api_key": "..."
  }
}
```

### Environment-specific Secrets Loading
```typescript
// packages/api/src/config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function loadSecrets() {
  if (process.env.NODE_ENV === 'development') {
    // Use .env file locally
    return;
  }

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const secretName = `traveltomorrow/${process.env.NODE_ENV}`;

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  const secrets = JSON.parse(response.SecretString!);

  // Inject into process.env
  Object.assign(process.env, secrets);
}
```

---

## 8. Monitoring & Logging Setup

### Application Logging (Winston)
```typescript
// packages/shared/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME,
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// In production, add CloudWatch transport
if (process.env.NODE_ENV === 'production') {
  const cloudWatchTransport = new CloudWatchTransport({
    logGroupName: '/aws/ecs/traveltomorrow',
    logStreamName: process.env.SERVICE_NAME,
  });
  logger.add(cloudWatchTransport);
}
```

### Health Check Endpoints
```typescript
// packages/api/src/routes/health.ts
import { Router } from 'express';
import { db } from '../database';
import { redis } from '../cache';

const router = Router();

router.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    duffel: false,
  };

  try {
    await db.raw('SELECT 1');
    checks.database = true;
  } catch (err) {
    // log error
  }

  try {
    await redis.ping();
    checks.redis = true;
  } catch (err) {
    // log error
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

---

## 9. Third-Party Integration Setup

### Duffel API Client
```typescript
// packages/shared/src/clients/duffel.ts
import { Duffel } from '@duffel/api';

export const duffelClient = new Duffel({
  token: process.env.DUFFEL_API_KEY!,
  debug: process.env.NODE_ENV === 'development',
});

// Test connection
export async function testDuffelConnection() {
  try {
    const airlines = await duffelClient.airlines.list({ limit: 1 });
    return { success: true, airlines: airlines.data.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Booking.com Affiliate Setup
```typescript
// packages/shared/src/clients/booking.ts
export class BookingAffiliateClient {
  private affiliateId: string;
  private deepLinkBase: string;

  constructor() {
    this.affiliateId = process.env.BOOKING_AFFILIATE_ID!;
    this.deepLinkBase = process.env.BOOKING_DEEP_LINK_BASE!;
  }

  generateDeepLink(params: {
    cityId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
  }) {
    const url = new URL(this.deepLinkBase);
    url.searchParams.set('aid', this.affiliateId);
    url.searchParams.set('dest_id', params.cityId);
    url.searchParams.set('checkin', params.checkIn);
    url.searchParams.set('checkout', params.checkOut);
    url.searchParams.set('group_adults', params.adults.toString());

    return url.toString();
  }
}
```

### Integration Check Script
```bash
#!/bin/bash
# scripts/check-integrations.sh

echo "Checking third-party integrations..."

# Check Duffel
echo -n "Duffel API: "
curl -s -H "Authorization: Bearer $DUFFEL_API_KEY" \
  https://api.duffel.com/air/airlines?limit=1 | jq -r '.data[0].name' || echo "FAILED"

# Check database
echo -n "Database: "
psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1 && echo "OK" || echo "FAILED"

# Check Redis
echo -n "Redis: "
redis-cli -u $REDIS_URL ping || echo "FAILED"

echo "Integration check complete"
```

---

## 10. Testing & QA Setup

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.interface.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

## Deliverables

- [ ] Monorepo structure created
- [ ] Docker Compose configuration for local development
- [ ] GitHub Actions CI/CD pipelines configured
- [ ] Terraform infrastructure scripts ready
- [ ] Environment variable templates created
- [ ] Code quality tools (ESLint, Prettier, Husky) configured
- [ ] Third-party client libraries initialized
- [ ] Health check endpoints implemented
- [ ] Integration check scripts created
- [ ] Documentation updated

## Success Criteria

1. ✅ Developers can run `npm run setup` and have a working local environment
2. ✅ CI pipeline passes for all packages
3. ✅ All third-party integrations verified (Duffel, Booking.com)
4. ✅ Infrastructure can be provisioned via Terraform
5. ✅ Secrets are properly managed (not in code)
6. ✅ Health checks return 200 OK

## Timeline

**Estimated Duration:** 1-2 weeks

## Dependencies

- AWS account with appropriate permissions
- Duffel API account (test + production keys)
- Booking.com affiliate account
- GitHub repository access
- Domain name configured

---

**Next Stage:** [01-foundations.md](./01-foundations.md)
