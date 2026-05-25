ALTER TABLE "maintenance_records"
ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'maintenance';
