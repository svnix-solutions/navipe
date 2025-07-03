#!/bin/bash

echo "Setting up Payment Router Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "Docker Compose is not available. Please update Docker to a newer version."
    exit 1
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env file with your actual credentials."
fi

# Start services
echo "Starting services..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Check if services are running
echo "Checking service status..."
docker compose ps

echo ""
echo "Setup complete! Services are running at:"
echo "- Hasura Console: http://localhost:8080/console"
echo "- Windmill: http://localhost:8000"
echo "- PgAdmin: http://localhost:8090"
echo "- PostgreSQL: localhost:5432"
echo ""
echo "Default credentials:"
echo "- Hasura Admin Secret: myadminsecret"
echo "- PgAdmin: admin@routepay.com / admin123"
echo "- PostgreSQL: routepay / routepay123"
echo ""
echo "Databases created:"
echo "- routepay (main application database)"
echo "- hasura_metadata (Hasura metadata storage)"
echo "- windmill (Windmill internal database)"
echo ""
echo "Next steps:"
echo "1. Access Hasura Console and track all tables"
echo "2. Configure relationships in Hasura"
echo "3. Set up Windmill workflows"
echo "4. Update .env file with your payment gateway credentials"