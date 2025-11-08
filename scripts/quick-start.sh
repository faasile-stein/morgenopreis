#!/bin/bash

#############################################################################
# Quick Start - Minimal setup for TravelTomorrow
# Just API + Supabase (no Laravel)
#############################################################################

set -e

echo "🚀 Quick Start - TravelTomorrow API"
echo ""

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd packages/api && npm install && cd ../..
cd packages/database && npm install && cd ../..

# Setup environment
if [ ! -f "packages/api/.env" ]; then
    echo "⚙️  Creating .env file..."
    cp packages/api/.env.example packages/api/.env
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo "🗄️  Starting Supabase..."
cd packages/database
npx supabase start
cd ../..

# Get Supabase credentials
SUPABASE_URL=$(cd packages/database && npx supabase status | grep "API URL" | awk '{print $3}' && cd ../..)
ANON_KEY=$(cd packages/database && npx supabase status | grep "anon key" | awk '{print $3}' && cd ../..)
SERVICE_KEY=$(cd packages/database && npx supabase status | grep "service_role key" | awk '{print $3}' && cd ../..)

# Update .env
sed -i '' "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|g" packages/api/.env
sed -i '' "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|g" packages/api/.env
sed -i '' "s|SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_KEY|g" packages/api/.env

# Run migrations
echo "🗃️  Running database migrations..."
cd packages/database
npx supabase db reset --db-only
cd ../..

# Start API
echo "🚀 Starting API server..."
cd packages/api
npm run dev
