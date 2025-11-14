#!/bin/bash

#############################################################################
# TravelTomorrow Local Development Environment
# For macOS
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Trap to cleanup on exit
cleanup() {
    print_header "Cleaning up..."

    # Kill background processes
    if [ ! -z "$SUPABASE_PID" ]; then
        print_status "Stopping Supabase..."
        cd packages/database && npx supabase stop
    fi

    if [ ! -z "$DOCKER_COMPOSE_PID" ]; then
        print_status "Stopping Docker services..."
        docker-compose down
    fi

    if [ ! -z "$API_PID" ]; then
        print_status "Stopping API server..."
        kill $API_PID 2>/dev/null || true
    fi

    if [ ! -z "$LARAVEL_PID" ]; then
        print_status "Stopping Laravel server..."
        kill $LARAVEL_PID 2>/dev/null || true
    fi

    print_success "Cleanup complete"
    exit 0
}

trap cleanup SIGINT SIGTERM

#############################################################################
# 1. Check Prerequisites
#############################################################################

print_header "Checking Prerequisites"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Install from https://nodejs.org/"
    exit 1
fi
print_success "Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm --version) found"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') found"

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop"
    exit 1
fi
print_success "Docker is running"

# Check PHP (for Laravel)
if command -v php &> /dev/null; then
    print_success "PHP $(php --version | head -n1 | cut -d' ' -f2) found"
    HAS_PHP=true
else
    print_warning "PHP not found. Laravel server will not start"
    print_warning "Install PHP with: brew install php"
    HAS_PHP=false
fi

# Check Composer (for Laravel)
if command -v composer &> /dev/null; then
    print_success "Composer $(composer --version | cut -d' ' -f3) found"
    HAS_COMPOSER=true
else
    print_warning "Composer not found. Laravel server will not start"
    print_warning "Install Composer from: https://getcomposer.org/"
    HAS_COMPOSER=false
fi

#############################################################################
# 2. Install Dependencies
#############################################################################

print_header "Installing Dependencies"

if [ ! -d "node_modules" ]; then
    print_status "Installing root dependencies..."
    npm install
else
    print_status "Root dependencies already installed"
fi

# Install API dependencies
if [ ! -d "packages/api/node_modules" ]; then
    print_status "Installing API dependencies..."
    cd packages/api && npm install && cd ../..
else
    print_status "API dependencies already installed"
fi

# Install Database dependencies
if [ ! -d "packages/database/node_modules" ]; then
    print_status "Installing Database dependencies..."
    cd packages/database && npm install && cd ../..
else
    print_status "Database dependencies already installed"
fi

# Install Shared dependencies
if [ ! -d "packages/shared/node_modules" ]; then
    print_status "Installing Shared dependencies..."
    cd packages/shared && npm install && cd ../..
else
    print_status "Shared dependencies already installed"
fi

print_success "All dependencies installed"

#############################################################################
# 3. Setup Environment Files
#############################################################################

print_header "Setting Up Environment Files"

# API environment
if [ ! -f "packages/api/.env" ]; then
    print_status "Creating API .env file..."
    cp packages/api/.env.example packages/api/.env
    print_warning "Please update packages/api/.env with your Duffel API key"
else
    print_status "API .env file exists"
fi

# Laravel environment
if [ "$HAS_PHP" = true ] && [ ! -f "packages/laravel/.env" ]; then
    print_status "Creating Laravel .env file..."
    cp packages/laravel/.env.example packages/laravel/.env
else
    print_status "Laravel .env file exists or PHP not available"
fi

#############################################################################
# 4. Start Docker Services (Redis, MailHog)
#############################################################################

print_header "Starting Docker Services"

print_status "Starting Redis and MailHog..."
docker-compose up -d
DOCKER_COMPOSE_PID=$$

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 3

# Check Redis
if docker-compose ps | grep -q "redis.*Up"; then
    print_success "Redis is running on port 6379"
else
    print_error "Redis failed to start"
    exit 1
fi

# Check MailHog
if docker-compose ps | grep -q "mailhog.*Up"; then
    print_success "MailHog is running"
    print_success "  • SMTP: localhost:6125"
    print_success "  • Web UI: http://localhost:6025"
else
    print_error "MailHog failed to start"
    exit 1
fi

#############################################################################
# 5. Start Supabase
#############################################################################

print_header "Starting Supabase"

cd packages/database

# Check if Supabase is already running
if npx supabase status &> /dev/null; then
    print_status "Supabase is already running"
else
    print_status "Starting Supabase (this may take a minute)..."
    npx supabase start
    SUPABASE_PID=$$
fi

# Get Supabase credentials
print_success "Supabase is running"
echo ""
npx supabase status
echo ""

# Extract credentials for .env
API_URL=$(npx supabase status | grep "API URL" | awk '{print $3}')
ANON_KEY=$(npx supabase status | grep "anon key" | awk '{print $3}')
SERVICE_KEY=$(npx supabase status | grep "service_role key" | awk '{print $3}')

cd ../..

# Update API .env with Supabase credentials
if [ -f "packages/api/.env" ]; then
    print_status "Updating API .env with Supabase credentials..."

    # Use sed on macOS
    sed -i '' "s|SUPABASE_URL=.*|SUPABASE_URL=$API_URL|g" packages/api/.env
    sed -i '' "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|g" packages/api/.env
    sed -i '' "s|SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_KEY|g" packages/api/.env

    print_success "API .env updated with Supabase credentials"
fi

#############################################################################
# 6. Run Database Migrations
#############################################################################

print_header "Running Database Migrations"

cd packages/database

if [ -f "supabase/migrations/20250108000001_initial_schema.sql" ]; then
    print_status "Pushing migrations to Supabase..."
    npx supabase db push
    print_success "Migrations completed"
else
    print_warning "No migrations found"
fi

# Run seed data
if [ -f "supabase/seed.sql" ]; then
    print_status "Loading seed data..."
    npx supabase db reset --db-only
    print_success "Seed data loaded"
fi

cd ../..

#############################################################################
# 7. Start API Server
#############################################################################

print_header "Starting API Server"

cd packages/api

print_status "Starting Express API on port 6001..."
npm run dev &
API_PID=$!

cd ../..

# Wait for API to be ready
print_status "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:6001/health > /dev/null; then
        print_success "API server is running on http://localhost:6001"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "API server failed to start"
        exit 1
    fi
    sleep 1
done

#############################################################################
# 8. Start Laravel Server (Optional)
#############################################################################

if [ "$HAS_PHP" = true ] && [ "$HAS_COMPOSER" = true ]; then
    print_header "Starting Laravel Server"

    cd packages/laravel

    # Install Laravel if not already installed
    if [ ! -f "artisan" ]; then
        print_status "Laravel not installed yet. See LARAVEL-QUICKSTART.md for setup"
    else
        print_status "Starting Laravel on port 6800..."
        php artisan serve --port=6800 &
        LARAVEL_PID=$!

        # Wait for Laravel to be ready
        sleep 3

        if curl -s http://localhost:6800 > /dev/null; then
            print_success "Laravel server is running on http://localhost:6800"
        else
            print_warning "Laravel may not have started correctly"
        fi
    fi

    cd ../..
else
    print_warning "Skipping Laravel (PHP or Composer not installed)"
fi

#############################################################################
# 9. Display Summary
#############################################################################

print_header "🚀 Development Environment Ready!"

echo ""
echo -e "${GREEN}Services Running:${NC}"
echo ""
echo -e "  ${BLUE}API Server:${NC}          http://localhost:6001"
echo -e "  ${BLUE}API Health:${NC}          http://localhost:6001/health"
echo ""
echo -e "  ${BLUE}Supabase Studio:${NC}     http://localhost:64323"
echo -e "  ${BLUE}Supabase API:${NC}        http://localhost:64321"
echo ""
echo -e "  ${BLUE}Redis:${NC}               localhost:6379"
echo ""
echo -e "  ${BLUE}MailHog SMTP:${NC}        localhost:6125"
echo -e "  ${BLUE}MailHog Web:${NC}         http://localhost:6025"
echo ""

if [ "$HAS_PHP" = true ] && [ -f "packages/laravel/artisan" ]; then
    echo -e "  ${BLUE}Laravel Website:${NC}     http://localhost:6800"
    echo ""
fi

echo -e "${YELLOW}Quick Links:${NC}"
echo ""
echo -e "  • Test wheel spin:        ${BLUE}POST http://localhost:6001/api/wheel/spin${NC}"
echo -e "  • View destinations:      ${BLUE}http://localhost:6800/destinations${NC}"
echo -e "  • API documentation:      ${BLUE}See docs/api/${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo ""
echo -e "  • View logs:              ${BLUE}docker-compose logs -f${NC}"
echo -e "  • Supabase status:        ${BLUE}cd packages/database && npx supabase status${NC}"
echo -e "  • Stop all:               ${BLUE}Press Ctrl+C${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
echo ""

# Keep script running
print_status "Press Ctrl+C to stop all services"
wait
