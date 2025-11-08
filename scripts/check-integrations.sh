#!/bin/bash

echo "🔍 Checking third-party integrations..."
echo ""

# Load environment variables
if [ -f packages/api/.env ]; then
    export $(cat packages/api/.env | grep -v '^#' | xargs)
fi

# Check Duffel API
echo -n "Duffel API: "
if [ -n "$DUFFEL_API_KEY" ] && [ "$DUFFEL_API_KEY" != "duffel_test_xxxxx" ]; then
    RESPONSE=$(curl -s -H "Authorization: Bearer $DUFFEL_API_KEY" \
      https://api.duffel.com/air/airlines?limit=1)

    if echo "$RESPONSE" | grep -q '"data"'; then
        echo "✅ OK"
    else
        echo "❌ FAILED - Invalid response"
    fi
else
    echo "⚠️  Not configured (using placeholder key)"
fi

# Check Database
echo -n "PostgreSQL: "
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAILED - Cannot connect"
fi

# Check Redis
echo -n "Redis: "
if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAILED - Cannot connect"
fi

# Check MailHog
echo -n "MailHog: "
if curl -s http://localhost:8025 > /dev/null 2>&1; then
    echo "✅ OK"
else
    echo "❌ FAILED - Not running"
fi

echo ""
echo "Integration check complete"
