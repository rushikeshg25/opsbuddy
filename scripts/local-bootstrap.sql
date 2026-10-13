-- Run only against the isolated opsbuddy_local database, AFTER cmd/seed.
-- The seed command creates ordinary tables and synthetic log history.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'opsbuddy_local' THEN
    RAISE EXCEPTION 'This script is only for opsbuddy_local';
  END IF;
END $$;
UPDATE products SET health_api = 'http://127.0.0.1:3500/health' WHERE user_id = 1;
-- SeedData inserts user ID 1 explicitly; keep the sequence ahead of existing IDs.
SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT MAX(id) FROM users), 1));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'logs' AND hypertable_schema = 'public') THEN
    ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_pkey;
    PERFORM create_hypertable('logs', 'timestamp', migrate_data => TRUE, if_not_exists => TRUE);
    ALTER TABLE logs ADD PRIMARY KEY (id, timestamp);
  END IF;
END $$;
