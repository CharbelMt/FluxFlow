import { pgTable, unique, check, uuid, varchar, timestamp, foreignKey, integer, index, date, text } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("users_email_key").on(table.email),
	check("users_role_check", sql`(role)::text = ANY ((ARRAY['admin'::character varying, 'manager'::character varying, 'supervisor'::character varying])::text[])`),
]);

export const sites = pgTable("sites", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	locationGps: varchar("location_gps", { length: 255 }),
	managerId: uuid("manager_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "sites_manager_id_fkey"
		}),
]);

export const siteSupervisors = pgTable("site_supervisors", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	siteId: uuid("site_id"),
	supervisorId: uuid("supervisor_id"),
}, (table) => [
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "site_supervisors_site_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supervisorId],
			foreignColumns: [users.id],
			name: "site_supervisors_supervisor_id_fkey"
		}).onDelete("cascade"),
]);

export const storageRooms = pgTable("storage_rooms", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	siteId: uuid("site_id"),
	roomLabel: varchar("room_label", { length: 255 }).notNull(),
	roomTagUid: varchar("room_tag_uid", { length: 255 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.siteId],
			foreignColumns: [sites.id],
			name: "storage_rooms_site_id_fkey"
		}).onDelete("cascade"),
	unique("storage_rooms_room_tag_uid_key").on(table.roomTagUid),
]);

export const assetTypes = pgTable("asset_types", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	modelName: varchar("model_name", { length: 255 }).notNull(),
	manufacturer: varchar({ length: 255 }),
	category: varchar({ length: 100 }),
	maintenanceIntervalHrs: integer("maintenance_interval_hrs").default(0),
});

export const assetInstances = pgTable("asset_instances", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	typeId: uuid("type_id"),
	serialNumber: varchar("serial_number", { length: 255 }).notNull(),
	assignedSiteId: uuid("assigned_site_id"),
	currentRoomId: uuid("current_room_id"),
	status: varchar({ length: 50 }).default('on_site'),
	versionClock: integer("version_clock").default(0),
	totalHoursUsed: integer("total_hours_used").default(0),
}, (table) => [
	foreignKey({
			columns: [table.typeId],
			foreignColumns: [assetTypes.id],
			name: "asset_instances_type_id_fkey"
		}),
	foreignKey({
			columns: [table.assignedSiteId],
			foreignColumns: [sites.id],
			name: "asset_instances_assigned_site_id_fkey"
		}),
	foreignKey({
			columns: [table.currentRoomId],
			foreignColumns: [storageRooms.id],
			name: "asset_instances_current_room_id_fkey"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	assetId: uuid("asset_id"),
	roomId: uuid("room_id"),
	supervisorId: uuid("supervisor_id"),
	clientCreatedAt: timestamp("client_created_at", { mode: 'string' }).notNull(),
	serverSyncedAt: timestamp("server_synced_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	actionType: varchar("action_type", { length: 50 }),
	witnessGps: varchar("witness_gps", { length: 255 }),
	conditionScore: integer("condition_score"),
	hoursUsedIncrement: integer("hours_used_increment").default(0),
	syncVersion: integer("sync_version"),
}, (table) => [
	index("regression_index").using("btree", table.assetId.asc().nullsLast().op("timestamp_ops"), table.clientCreatedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assetInstances.id],
			name: "audit_logs_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [storageRooms.id],
			name: "audit_logs_room_id_fkey"
		}),
	foreignKey({
			columns: [table.supervisorId],
			foreignColumns: [users.id],
			name: "audit_logs_supervisor_id_fkey"
		}),
	check("audit_logs_condition_score_check", sql`(condition_score >= 1) AND (condition_score <= 5)`),
]);

export const maintenanceRecords = pgTable("maintenance_records", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	assetId: uuid("asset_id"),
	serviceDate: date("service_date").default(sql`CURRENT_DATE`),
	technicianNotes: text("technician_notes"),
}, (table) => [
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assetInstances.id],
			name: "maintenance_records_asset_id_fkey"
		}),
]);
