#!/bin/bash
set -e

echo "🚀 Setting up TravelTomorrow development environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20.x"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker"
    exit 1
fi

echo "✅ Docker found: $(docker --version)"

# Check Docker daemon access
if ! docker ps &> /dev/null; then
    echo ""
    echo "❌ Cannot connect to Docker daemon. This is usually a permissions issue."
    echo ""
    echo "To fix this, run the following commands:"
    echo "  sudo usermod -aG docker $USER"
    echo "  newgrp docker"
    echo ""
    echo "Alternatively, you can:"
    echo "  1. Log out and log back in for group changes to take effect"
    echo "  2. Or run this script with sudo (not recommended)"
    echo ""
    echo "After fixing permissions, run this script again."
    exit 1
fi

echo "✅ Docker daemon accessible"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up environment files
echo "⚙️  Setting up environment files..."
if [ ! -f packages/api/.env ]; then
    cp packages/api/.env.example packages/api/.env
    echo "✅ Created packages/api/.env"
fi

if [ ! -f packages/web/.env.local ]; then
    cp packages/web/.env.example packages/web/.env.local
    echo "✅ Created packages/web/.env.local"
fi

if [ ! -f packages/mobile/.env ]; then
    cp packages/mobile/.env.example packages/mobile/.env
    echo "✅ Created packages/mobile/.env"
fi

# Set up Husky
echo "🐶 Setting up Husky git hooks..."
npx husky install
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env files with your API keys (Duffel, Stripe, etc.)"
echo "  2. Run migrations: npm run migrate:dev"
echo "  3. Seed database: npm run seed:dev"
echo "  4. Start development: npm run dev"
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MailHog UI: http://localhost:8025"
echo "  - Drupal: http://localhost:8080 (when configured)"
echo ""
