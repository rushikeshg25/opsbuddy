#!/bin/bash
docker exec -it timescaledb psql -U postgres -d opsbuddy -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
docker exec -it timescaledb psql -U postgres -d opsbuddy -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"