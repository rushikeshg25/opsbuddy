-- PostgreSQL 14 / TimescaleDB. Run with psql against the application database.
-- Apply off-peak: hypertable indexes do not support CREATE INDEX CONCURRENTLY.
-- These non-unique indexes preserve existing rows and constraints.
CREATE INDEX IF NOT EXISTS idx_logs_product_time_id ON logs (product_id, timestamp DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_downtimes_product_start ON downtimes (product_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_downtimes_active_product ON downtimes (product_id, start_time DESC) WHERE end_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_user_created ON products (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_auth_token ON products (auth_token);
CREATE INDEX IF NOT EXISTS idx_quick_fixes_product_created ON quick_fixes (product_id, created_at DESC);
ANALYZE logs;
ANALYZE downtimes;
ANALYZE products;
ANALYZE quick_fixes;
