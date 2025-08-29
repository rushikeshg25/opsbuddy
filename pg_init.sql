
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_database WHERE datname = 'opsbuddy'
   ) THEN
      PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE opsbuddy');
   END IF;
END $$;

\c opsbuddy;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    provider VARCHAR(50) DEFAULT 'google',
    provider_id VARCHAR(255),
    access_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auth_token UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    log TEXT NOT NULL,
    time TIMESTAMP NOT NULL DEFAULT NOW()
);

