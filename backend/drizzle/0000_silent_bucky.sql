-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ((role)::text = ANY ((ARRAY['admin'::character varying, 'manager'::character varying, 'supervisor'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"location_gps" varchar(255),
	"manager_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "site_supervisors" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"site_id" uuid,
	"supervisor_id" uuid
);
--> statement-breakpoint
CREATE TABLE "storage_rooms" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"site_id" uuid,
	"room_label" varchar(255) NOT NULL,
	"room_tag_uid" varchar(255) NOT NULL,
	CONSTRAINT "storage_rooms_room_tag_uid_key" UNIQUE("room_tag_uid")
);
--> statement-breakpoint
CREATE TABLE "asset_types" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"model_name" varchar(255) NOT NULL,
	"manufacturer" varchar(255),
	"category" varchar(100),
	"maintenance_interval_hrs" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "asset_instances" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"type_id" uuid,
	"serial_number" varchar(255) NOT NULL,
	"assigned_site_id" uuid,
	"current_room_id" uuid,
	"status" varchar(50) DEFAULT 'on_site',
	"version_clock" integer DEFAULT 0,
	"total_hours_used" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"asset_id" uuid,
	"room_id" uuid,
	"supervisor_id" uuid,
	"client_created_at" timestamp NOT NULL,
	"server_synced_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"action_type" varchar(50),
	"witness_gps" varchar(255),
	"condition_score" integer,
	"hours_used_increment" integer DEFAULT 0,
	"sync_version" integer,
	CONSTRAINT "audit_logs_condition_score_check" CHECK ((condition_score >= 1) AND (condition_score <= 5))
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"asset_id" uuid,
	"service_date" date DEFAULT CURRENT_DATE,
	"technician_notes" text
);
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_supervisors" ADD CONSTRAINT "site_supervisors_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_supervisors" ADD CONSTRAINT "site_supervisors_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_rooms" ADD CONSTRAINT "storage_rooms_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_instances" ADD CONSTRAINT "asset_instances_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."asset_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_instances" ADD CONSTRAINT "asset_instances_assigned_site_id_fkey" FOREIGN KEY ("assigned_site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_instances" ADD CONSTRAINT "asset_instances_current_room_id_fkey" FOREIGN KEY ("current_room_id") REFERENCES "public"."storage_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."storage_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "regression_index" ON "audit_logs" USING btree ("asset_id" timestamp_ops,"client_created_at" timestamp_ops);
*/