import { relations } from "drizzle-orm/relations";
import { users, sites, siteSupervisors, storageRooms, assetTypes, assetInstances, auditLogs, maintenanceRecords } from "./schema";

export const sitesRelations = relations(sites, ({one, many}) => ({
	user: one(users, {
		fields: [sites.managerId],
		references: [users.id]
	}),
	siteSupervisors: many(siteSupervisors),
	storageRooms: many(storageRooms),
	assetInstances: many(assetInstances),
}));

export const usersRelations = relations(users, ({many}) => ({
	sites: many(sites),
	siteSupervisors: many(siteSupervisors),
	auditLogs: many(auditLogs),
}));

export const siteSupervisorsRelations = relations(siteSupervisors, ({one}) => ({
	site: one(sites, {
		fields: [siteSupervisors.siteId],
		references: [sites.id]
	}),
	user: one(users, {
		fields: [siteSupervisors.supervisorId],
		references: [users.id]
	}),
}));

export const storageRoomsRelations = relations(storageRooms, ({one, many}) => ({
	site: one(sites, {
		fields: [storageRooms.siteId],
		references: [sites.id]
	}),
	assetInstances: many(assetInstances),
	auditLogs: many(auditLogs),
}));

export const assetInstancesRelations = relations(assetInstances, ({one, many}) => ({
	assetType: one(assetTypes, {
		fields: [assetInstances.typeId],
		references: [assetTypes.id]
	}),
	site: one(sites, {
		fields: [assetInstances.assignedSiteId],
		references: [sites.id]
	}),
	storageRoom: one(storageRooms, {
		fields: [assetInstances.currentRoomId],
		references: [storageRooms.id]
	}),
	auditLogs: many(auditLogs),
	maintenanceRecords: many(maintenanceRecords),
}));

export const assetTypesRelations = relations(assetTypes, ({many}) => ({
	assetInstances: many(assetInstances),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	assetInstance: one(assetInstances, {
		fields: [auditLogs.assetId],
		references: [assetInstances.id]
	}),
	storageRoom: one(storageRooms, {
		fields: [auditLogs.roomId],
		references: [storageRooms.id]
	}),
	user: one(users, {
		fields: [auditLogs.supervisorId],
		references: [users.id]
	}),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({one}) => ({
	assetInstance: one(assetInstances, {
		fields: [maintenanceRecords.assetId],
		references: [assetInstances.id]
	}),
}));