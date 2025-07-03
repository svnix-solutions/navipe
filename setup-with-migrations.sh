#!/bin/bash

echo "Setting up Payment Router Platform with Hasura Migrations..."

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

# Check if Hasura CLI is installed
if ! command -v hasura &> /dev/null; then
    echo "Hasura CLI is not installed. Installing..."
    curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh | bash
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
sleep 15

# Wait for Hasura to be ready
echo "Waiting for Hasura to be ready..."
sleep 10

# Apply Hasura migrations
echo "Applying Hasura migrations..."
cd hasura
hasura migrate apply --admin-secret myadminsecret
hasura metadata apply --admin-secret myadminsecret

# Apply seed data
echo "Applying seed data..."
hasura seed apply --admin-secret myadminsecret

cd ..

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
echo "1. Access Hasura Console - migrations are already applied!"
echo "2. Set up Windmill workflows"
echo "3. Update .env file with your payment gateway credentials"
echo ""
echo "To make database changes:"
echo "1. cd hasura"
echo "2. hasura migrate create 'migration_name' --from-server --admin-secret myadminsecret"
echo "3. hasura metadata export --admin-secret myadminsecret"