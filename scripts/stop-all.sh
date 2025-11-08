#!/bin/bash

#############################################################################
# Stop All TravelTomorrow Services
#############################################################################

echo "🛑 Stopping all services..."

# Stop Docker services
echo "Stopping Docker services..."
docker-compose down

# Stop Supabase
echo "Stopping Supabase..."
cd packages/database && npx supabase stop && cd ../..

# Kill any running processes on our ports
echo "Cleaning up processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true  # API
lsof -ti:8000 | xargs kill -9 2>/dev/null || true  # Laravel
lsof -ti:54321 | xargs kill -9 2>/dev/null || true # Supabase API
lsof -ti:54323 | xargs kill -9 2>/dev/null || true # Supabase Studio

echo "✅ All services stopped"
