import { Elysia, t } from "elysia";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { jwt } from "@elysiajs/jwt";
import * as schema from "./db/schema";
import cors from "@elysiajs/cors";
import QRCode from "qrcode";

const supervisorEmailDomain = "@fluxflow.com";

function normalizeSupervisorEmail(email: string) {
	const trimmed_email = email.trim();
	return trimmed_email.toLowerCase().endsWith(supervisorEmailDomain)
		? trimmed_email
		: `${trimmed_email}${supervisorEmailDomain}`;
}

function isValidMaintenanceInterval(value: number) {
	return Number.isFinite(value) && value >= 0;
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle(client, { schema });

const corsOrigin = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(",")
	: process.env.NODE_ENV !== "production"
		? "*"
		: "http://localhost:9300";

const app = new Elysia()
	.use(
		cors({
			origin: corsOrigin,
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	)

	.post("/usage/batch", async ({ body, set }) => {
		if (!Array.isArray(body)) {
			set.status = 400;
			return { error: "Batch payload must be an array." };
		}

		const results = [] as Array<{
			localId: number | null;
			success: boolean;
			reason: string | null;
		}>;

		for (const raw_item of body) {
			const local_id =
				typeof raw_item === "object" &&
				raw_item !== null &&
				"local_id" in raw_item
					? Number((raw_item as { local_id?: unknown }).local_id)
					: null;

			const asset_id =
				typeof raw_item === "object" &&
				raw_item !== null &&
				"asset_id" in raw_item
					? String((raw_item as { asset_id?: unknown }).asset_id)
					: "";

			const runtime_hours =
				typeof raw_item === "object" &&
				raw_item !== null &&
				"runtime_hours" in raw_item
					? Number((raw_item as { runtime_hours?: unknown }).runtime_hours)
					: Number.NaN;

			const timestamp =
				typeof raw_item === "object" &&
				raw_item !== null &&
				"timestamp" in raw_item
					? String((raw_item as { timestamp?: unknown }).timestamp)
					: "";

			if (!asset_id) {
				results.push({
					localId: Number.isFinite(local_id) ? local_id : null,
					success: false,
					reason: "invalid_asset_id",
				});
				continue;
			}

			if (!Number.isFinite(runtime_hours) || runtime_hours <= 0) {
				results.push({
					localId: Number.isFinite(local_id) ? local_id : null,
					success: false,
					reason: "invalid_runtime_hours",
				});
				continue;
			}

			if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) {
				results.push({
					localId: Number.isFinite(local_id) ? local_id : null,
					success: false,
					reason: "invalid_timestamp",
				});
				continue;
			}

			const fetched_asset = await db.query.assetInstances.findFirst({
				where: eq(schema.assetInstances.id, asset_id),
				columns: {
					id: true,
					totalHoursUsed: true,
					versionClock: true,
				},
			});

			if (!fetched_asset) {
				results.push({
					localId: Number.isFinite(local_id) ? local_id : null,
					success: false,
					reason: "asset_not_found",
				});
				continue;
			}

			try {
				await db.transaction(async (tx) => {
					const hours_increment = Math.max(0, Math.round(runtime_hours));
					const next_total_hours =
						(fetched_asset.totalHoursUsed || 0) + hours_increment;
					const next_version_clock = (fetched_asset.versionClock || 0) + 1;

					await tx
						.update(schema.assetInstances)
						.set({
							totalHoursUsed: next_total_hours,
							versionClock: next_version_clock,
						})
						.where(eq(schema.assetInstances.id, asset_id));

					await tx.insert(schema.auditLogs).values({
						assetId: asset_id,
						clientCreatedAt: timestamp,
						actionType: "usage_batch",
						hoursUsedIncrement: hours_increment,
						syncVersion: next_version_clock,
					});
				});

				results.push({
					localId: Number.isFinite(local_id) ? local_id : null,
					success: true,
					reason: null,
				});
			} catch (error) {
				results.push({
					localId: Number.isFinite(local_id) ? local_id : null,
					success: false,
					reason: "server_error",
				});
			}
		}

		return results;
	})

	.use(
		jwt({
			name: "jwt",
			secret: process.env.JWT_SECRET || "FORGE_A_BETTER_SECRET_THAN_THIS",
		}),
	)

	.post(
		"/login",
		async ({ body, set, jwt }) => {
			const user_record = await db.query.users.findFirst({
				where: eq(schema.users.email, body.email),
			});

			if (
				!user_record ||
				!(await Bun.password.verify(body.password, user_record.passwordHash))
			) {
				set.status = 401;
				return { error: "Invalid credentials" };
			}

			const token = await jwt.sign({
				sub: user_record.id,
				role: user_record.role,
			});

			const { passwordHash, ...safe_user } = user_record;
			return {
				success: true,
				token,
				user: safe_user,
			};
		},
		{
			body: t.Object({
				email: t.String(),
				password: t.String(),
			}),
		},
	)

	.post(
		"/me/change-password",
		async ({ headers, body, jwt, set }) => {
			const auth_header = headers.authorization;

			if (!auth_header || !auth_header.startsWith("Bearer ")) {
				set.status = 401;
				return { error: "Unauthorized." };
			}

			const token = auth_header.slice(7);
			const payload = await jwt.verify(token);

			if (!payload || typeof payload !== "object" || !("sub" in payload)) {
				set.status = 401;
				return { error: "Invalid token." };
			}

			const user_id = String((payload as { sub: string }).sub);
			const user_record = await db.query.users.findFirst({
				where: eq(schema.users.id, user_id),
			});

			if (!user_record) {
				set.status = 404;
				return { error: "User not found." };
			}

			const is_current_password_valid = await Bun.password.verify(
				body.current_password,
				user_record.passwordHash,
			);

			if (!is_current_password_valid) {
				set.status = 400;
				return { error: "Current password is incorrect." };
			}

			if (body.current_password === body.new_password) {
				set.status = 400;
				return {
					error: "New password must be different from current password.",
				};
			}

			const new_password_hash = await Bun.password.hash(body.new_password);

			await db
				.update(schema.users)
				.set({
					passwordHash: new_password_hash,
				})
				.where(eq(schema.users.id, user_id));

			return { success: true };
		},
		{
			body: t.Object({
				current_password: t.String(),
				new_password: t.String({ minLength: 6 }),
			}),
		},
	)

	.group("/sites", (app) =>
		app
			.get("/", async () => {
				return await db.query.sites.findMany({
					orderBy: [asc(schema.sites.createdAt)],
					with: {
						storageRooms: true,
					},
				});
			})

			.post(
				"/",
				async ({ body }) => {
					const new_site = await db
						.insert(schema.sites)
						.values({
							name: body.name,
							locationGps: body.location_gps,
							managerId: body.manager_id,
						})
						.returning();

					return { success: true, site: new_site[0] };
				},
				{
					body: t.Object({
						name: t.String(),
						location_gps: t.Optional(t.String()),
						manager_id: t.String(),
					}),
				},
			)

			.put(
				"/:site_id",
				async ({ params, body, set }) => {
					const existing_site = await db.query.sites.findFirst({
						where: eq(schema.sites.id, params.site_id),
					});

					if (!existing_site) {
						set.status = 404;
						return { error: "Site not found." };
					}

					const [updated_site] = await db
						.update(schema.sites)
						.set({
							name: body.name,
							locationGps: body.location_gps,
							managerId: body.manager_id,
						})
						.where(eq(schema.sites.id, params.site_id))
						.returning();

					return { success: true, site: updated_site };
				},
				{
					params: t.Object({
						site_id: t.String(),
					}),
					body: t.Object({
						name: t.String(),
						location_gps: t.Optional(t.String()),
						manager_id: t.String(),
					}),
				},
			)

			.delete(
				"/:site_id",
				async ({ params, set }) => {
					const existing_site = await db.query.sites.findFirst({
						where: eq(schema.sites.id, params.site_id),
					});

					if (!existing_site) {
						set.status = 404;
						return { error: "Site not found." };
					}

					await db.transaction(async (tx) => {
						const site_rooms = await tx.query.storageRooms.findMany({
							where: eq(schema.storageRooms.siteId, params.site_id),
							columns: { id: true },
						});

						const room_ids = site_rooms
							.map((room) => room.id)
							.filter(Boolean) as string[];

						if (room_ids.length > 0) {
							await tx
								.update(schema.assetInstances)
								.set({ currentRoomId: null })
								.where(inArray(schema.assetInstances.currentRoomId, room_ids));

							await tx
								.update(schema.auditLogs)
								.set({ roomId: null })
								.where(inArray(schema.auditLogs.roomId, room_ids));
						}

						await tx
							.update(schema.assetInstances)
							.set({ assignedSiteId: null })
							.where(eq(schema.assetInstances.assignedSiteId, params.site_id));

						await tx
							.delete(schema.siteSupervisors)
							.where(eq(schema.siteSupervisors.siteId, params.site_id));

						await tx
							.delete(schema.storageRooms)
							.where(eq(schema.storageRooms.siteId, params.site_id));

						await tx
							.delete(schema.sites)
							.where(eq(schema.sites.id, params.site_id));
					});

					return { success: true };
				},
				{
					params: t.Object({
						site_id: t.String(),
					}),
				},
			),
	)

	.group("/storage-rooms", (app) =>
		app
			.get(
				"/:room_id",
				async ({ params, set }) => {
					const fetched_room = await db.query.storageRooms.findFirst({
						where: eq(schema.storageRooms.id, params.room_id),
						with: {
							site: true,
						},
					});

					if (!fetched_room) {
						set.status = 404;
						return { error: "Storage room not found." };
					}

					return { success: true, room: fetched_room };
				},
				{
					params: t.Object({
						room_id: t.String(),
					}),
				},
			)

			.get(
				"/:room_id/qr",
				async ({ params, set }) => {
					const fetched_room = await db.query.storageRooms.findFirst({
						where: eq(schema.storageRooms.id, params.room_id),
						columns: {
							id: true,
							roomLabel: true,
						},
					});

					if (!fetched_room) {
						set.status = 404;
						return { error: "Storage room not found." };
					}

					try {
						const qr_payload = fetched_room.id;
						const qr_svg = await QRCode.toString(qr_payload, {
							type: "svg",
							margin: 1,
							width: 320,
						});

						return {
							success: true,
							qrSvg: qr_svg,
							qrPayload: qr_payload,
							room: fetched_room,
						};
					} catch (error) {
						set.status = 500;
						return {
							error: "Failed to generate storage room QR.",
							details: String(error),
						};
					}
				},
				{
					params: t.Object({
						room_id: t.String(),
					}),
				},
			)

			.put(
				"/:room_id",
				async ({ params, body, set }) => {
					const existing_room = await db.query.storageRooms.findFirst({
						where: eq(schema.storageRooms.id, params.room_id),
					});

					if (!existing_room) {
						set.status = 404;
						return { error: "Storage room not found." };
					}

					try {
						const [updated_room] = await db
							.update(schema.storageRooms)
							.set({
								roomLabel: body.room_label,
								roomTagUid: existing_room.id,
							})
							.where(eq(schema.storageRooms.id, params.room_id))
							.returning();

						return { success: true, room: updated_room };
					} catch (error) {
						set.status = 400;
						return {
							error: "Could not update storage room. UID might already exist.",
						};
					}
				},
				{
					params: t.Object({
						room_id: t.String(),
					}),
					body: t.Object({
						room_label: t.String(),
					}),
				},
			)

			.post(
				"/",
				async ({ body }) => {
					const room_id = crypto.randomUUID();
					const room_tag_uid = body.room_tag_uid?.trim() || room_id;
					const new_room = await db
						.insert(schema.storageRooms)
						.values({
							id: room_id,
							siteId: body.site_id,
							roomLabel: body.room_label,
							roomTagUid: room_tag_uid,
						})
						.returning();

					return { success: true, room: new_room[0] };
				},
				{
					body: t.Object({
						site_id: t.String(),
						room_label: t.String(),
						room_tag_uid: t.Optional(t.String()),
					}),
				},
			),
	)

	.group("/assets", (app) =>
		app
			.get("/types", async () => {
				return await db.query.assetTypes.findMany();
			})

			.post(
				"/types",
				async ({ body, set }) => {
					if (!isValidMaintenanceInterval(body.maintenance_interval_hrs)) {
						set.status = 400;
						return { error: "Maintenance interval cannot be negative." };
					}

					try {
						const [new_type] = await db
							.insert(schema.assetTypes)
							.values({
								modelName: body.model_name,
								manufacturer: body.manufacturer,
								maintenanceIntervalHrs: body.maintenance_interval_hrs,
							})
							.returning();

						return { success: true, type: new_type };
					} catch (error) {
						set.status = 400;
						return {
							error: "Failed to create asset type",
							details: String(error),
						};
					}
				},
				{
					body: t.Object({
						model_name: t.String(),
						manufacturer: t.String(),
						category: t.Optional(t.String()),
						maintenance_interval_hrs: t.Number(),
					}),
				},
			)

			.put(
				"/types/:type_id",
				async ({ params, body, set }) => {
					const existing_type = await db.query.assetTypes.findFirst({
						where: eq(schema.assetTypes.id, params.type_id),
					});

					if (!existing_type) {
						set.status = 404;
						return { error: "Asset type not found." };
					}

					if (!isValidMaintenanceInterval(body.maintenance_interval_hrs)) {
						set.status = 400;
						return { error: "Maintenance interval cannot be negative." };
					}

					try {
						const [updated_type] = await db
							.update(schema.assetTypes)
							.set({
								modelName: body.model_name,
								manufacturer: body.manufacturer,
								maintenanceIntervalHrs: body.maintenance_interval_hrs,
							})
							.where(eq(schema.assetTypes.id, params.type_id))
							.returning();

						return { success: true, type: updated_type };
					} catch (error) {
						set.status = 400;
						return {
							error: "Failed to update asset type",
							details: String(error),
						};
					}
				},
				{
					params: t.Object({
						type_id: t.String(),
					}),
					body: t.Object({
						model_name: t.String(),
						manufacturer: t.String(),
						category: t.Optional(t.String()),
						maintenance_interval_hrs: t.Number(),
					}),
				},
			)

			.delete(
				"/types/:type_id",
				async ({ params, set }) => {
					const existing_type = await db.query.assetTypes.findFirst({
						where: eq(schema.assetTypes.id, params.type_id),
					});

					if (!existing_type) {
						set.status = 404;
						return { error: "Asset type not found." };
					}

					// Check if this type is being used by any assets
					const assets_using_type = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.typeId, params.type_id),
						columns: { id: true },
					});

					if (assets_using_type) {
						set.status = 400;
						return {
							error: "Cannot delete asset type that is in use by assets.",
						};
					}

					await db
						.delete(schema.assetTypes)
						.where(eq(schema.assetTypes.id, params.type_id));

					return { success: true };
				},
				{
					params: t.Object({
						type_id: t.String(),
					}),
				},
			)

			.get("/", async () => {
				return await db.query.assetInstances.findMany({
					with: {
						type: true,
						site: true,
						room: true,
					},
				});
			})

			.get(
				"/:asset_id",
				async ({ params, set }) => {
					const fetched_asset = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.id, params.asset_id),
						with: {
							type: true,
							site: true,
							room: true,
						},
					});

					if (!fetched_asset) {
						set.status = 404;
						return { error: "Asset not found." };
					}

					return { success: true, asset: fetched_asset };
				},
				{
					params: t.Object({
						asset_id: t.String(),
					}),
				},
			)

			.get(
				"/:asset_id/maintenance",
				async ({ params, set }) => {
					const fetched_asset = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.id, params.asset_id),
						columns: { id: true },
					});

					if (!fetched_asset) {
						set.status = 404;
						return { error: "Asset not found." };
					}

					const maintenance_records =
						await db.query.maintenanceRecords.findMany({
							where: eq(schema.maintenanceRecords.assetId, params.asset_id),
							orderBy: [desc(schema.maintenanceRecords.serviceDate)],
						});

					return { success: true, maintenance_records };
				},
				{
					params: t.Object({
						asset_id: t.String(),
					}),
				},
			)

			.post(
				"/:asset_id/maintenance",
				async ({ params, body, set }) => {
					const fetched_asset = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.id, params.asset_id),
						columns: { id: true },
					});

					if (!fetched_asset) {
						set.status = 404;
						return { error: "Asset not found." };
					}

					try {
						const [maintenance_record] = await db
							.insert(schema.maintenanceRecords)
							.values({
								assetId: params.asset_id,
								serviceDate: body.service_date,
								status: body.status,
								technicianNotes: body.notes || null,
							})
							.returning();

						return { success: true, maintenance_record };
					} catch (error) {
						set.status = 400;
						return {
							error: "Failed to save maintenance record.",
							details: String(error),
						};
					}
				},
				{
					params: t.Object({
						asset_id: t.String(),
					}),
					body: t.Object({
						service_date: t.String(),
						status: t.String(),
						notes: t.Optional(t.String()),
					}),
				},
			)

			.get(
				"/:asset_id/qr",
				async ({ params, set }) => {
					const fetched_asset = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.id, params.asset_id),
						columns: {
							id: true,
							serialNumber: true,
						},
						with: {
							type: {
								columns: {
									modelName: true,
								},
							},
						},
					});

					if (!fetched_asset) {
						set.status = 404;
						return { error: "Asset not found." };
					}

					try {
						const qr_payload = fetched_asset.id;
						const qr_svg = await QRCode.toString(qr_payload, {
							type: "svg",
							margin: 1,
							width: 320,
						});

						return {
							success: true,
							qrSvg: qr_svg,
							qrPayload: qr_payload,
							asset: fetched_asset,
						};
					} catch (error) {
						set.status = 500;
						return {
							error: "Failed to generate asset QR.",
							details: String(error),
						};
					}
				},
				{
					params: t.Object({
						asset_id: t.String(),
					}),
				},
			)

			.post(
				"/:asset_id/usage",
				async ({ params, body, set }) => {
					const supervisor_record = await db.query.users.findFirst({
						where: eq(schema.users.id, body.supervisor_id),
					});

					if (!supervisor_record || supervisor_record.role !== "supervisor") {
						set.status = 403;
						return { error: "Forbidden: supervisor access required." };
					}

					const fetched_asset = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.id, params.asset_id),
					});

					if (!fetched_asset) {
						set.status = 404;
						return { error: "Asset not found." };
					}

					if (body.runtime_hours <= 0) {
						set.status = 400;
						return { error: "runtime_hours must be greater than zero." };
					}

					const hours_increment = Math.max(0, Math.round(body.runtime_hours));

					try {
						const result = await db.transaction(async (tx) => {
							const next_total_hours =
								(fetched_asset.totalHoursUsed || 0) + hours_increment;
							const next_version_clock = (fetched_asset.versionClock || 0) + 1;

							const [updated_asset] = await tx
								.update(schema.assetInstances)
								.set({
									totalHoursUsed: next_total_hours,
									status: body.status,
									versionClock: next_version_clock,
								})
								.where(eq(schema.assetInstances.id, params.asset_id))
								.returning();

							const [audit_log] = await tx
								.insert(schema.auditLogs)
								.values({
									assetId: params.asset_id,
									supervisorId: body.supervisor_id,
									clientCreatedAt: body.timestamp,
									actionType: "usage_update",
									witnessGps: body.update_notes || null,
									hoursUsedIncrement: hours_increment,
									syncVersion: next_version_clock,
								})
								.returning();

							return { updated_asset, audit_log };
						});

						return {
							success: true,
							asset: result.updated_asset,
							audit_log: result.audit_log,
						};
					} catch (error) {
						set.status = 400;
						return {
							error: "Failed to save usage log.",
							details: String(error),
						};
					}
				},
				{
					params: t.Object({
						asset_id: t.String(),
					}),
					body: t.Object({
						runtime_hours: t.Number(),
						update_notes: t.Optional(t.String()),
						status: t.String(),
						supervisor_id: t.String(),
						timestamp: t.String(),
					}),
				},
			)

			.delete(
				"/:asset_id",
				async ({ params, set }) => {
					const existing_asset = await db.query.assetInstances.findFirst({
						where: eq(schema.assetInstances.id, params.asset_id),
						columns: { id: true },
					});

					if (!existing_asset) {
						set.status = 404;
						return { error: "Asset not found." };
					}

					await db.transaction(async (tx) => {
						await tx
							.delete(schema.auditLogs)
							.where(eq(schema.auditLogs.assetId, params.asset_id));

						await tx
							.delete(schema.maintenanceRecords)
							.where(eq(schema.maintenanceRecords.assetId, params.asset_id));

						await tx
							.delete(schema.assetInstances)
							.where(eq(schema.assetInstances.id, params.asset_id));
					});

					return { success: true };
				},
				{
					params: t.Object({
						asset_id: t.String(),
					}),
				},
			)

			.post(
				"/bulk",
				async ({ body, set }) => {
					try {
						return await db.transaction(async (tx) => {
							let type_id = body.type_id;

							if (!type_id && body.new_type) {
								if (
									!isValidMaintenanceInterval(
										body.new_type.maintenance_interval_hrs,
									)
								) {
									set.status = 400;
									return { error: "Maintenance interval cannot be negative." };
								}

								const [new_type] = await tx
									.insert(schema.assetTypes)
									.values({
										modelName: body.new_type.model_name,
										manufacturer: body.new_type.manufacturer,
										maintenanceIntervalHrs:
											body.new_type.maintenance_interval_hrs,
									})
									.returning();

								if (!new_type) {
									set.status = 400;
									return { error: "Failed to create asset type" };
								}

								type_id = new_type.id;
							}

							if (!type_id) {
								set.status = 400;
								return { error: "Missing type_id or new_type definition" };
							}

							const instances_to_insert = body.serial_numbers.map((sn) => ({
								typeId: type_id!,
								serialNumber: sn,
								assignedSiteId: body.site_id,
								currentRoomId: body.room_id,
								status: "on_site",
							}));

							const created_instances = await tx
								.insert(schema.assetInstances)
								.values(instances_to_insert)
								.returning();

							return {
								success: true,
								count: created_instances.length,
								instances: created_instances,
							};
						});
					} catch (err) {
						set.status = 500;
						return { error: "Bulk allocation failed", details: String(err) };
					}
				},
				{
					body: t.Object({
						site_id: t.String(),
						room_id: t.String(),
						type_id: t.Optional(t.String()),
						new_type: t.Optional(
							t.Object({
								model_name: t.String(),
								manufacturer: t.String(),
								category: t.Optional(t.String()),
								maintenance_interval_hrs: t.Number(),
							}),
						),
						serial_numbers: t.Array(t.String()),
					}),
				},
			),
	)

	.get("/manager/:manager_id/supervisors", async ({ params, set }) => {
		const manager_record = await db.query.users.findFirst({
			where: eq(schema.users.id, params.manager_id),
		});

		if (!manager_record || manager_record.role !== "manager") {
			set.status = 403;
			return { error: "Forbidden: manager access required." };
		}

		const supervisors_list = await db.query.users.findMany({
			where: eq(schema.users.role, "supervisor"),
			columns: {
				id: true,
				fullName: true,
				email: true,
				role: true,
				createdAt: true,
			},
		});

		return { success: true, supervisors: supervisors_list };
	})

	.post(
		"/manager/:manager_id/supervisors",
		async ({ params, body, set }) => {
			const manager_record = await db.query.users.findFirst({
				where: eq(schema.users.id, params.manager_id),
			});

			if (!manager_record || manager_record.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const password_hash = await Bun.password.hash(body.password);
			const normalized_email = normalizeSupervisorEmail(body.email);

			try {
				const [created_user] = await db
					.insert(schema.users)
					.values({
						fullName: body.full_name,
						email: normalized_email,
						passwordHash: password_hash,
						role: "supervisor",
					})
					.returning({
						id: schema.users.id,
						fullName: schema.users.fullName,
						email: schema.users.email,
						role: schema.users.role,
						createdAt: schema.users.createdAt,
					});

				return { success: true, user: created_user };
			} catch (error) {
				set.status = 400;
				return {
					error: "Could not create supervisor. Email may already exist.",
				};
			}
		},
		{
			params: t.Object({
				manager_id: t.String(),
			}),
			body: t.Object({
				full_name: t.String(),
				email: t.String(),
				password: t.String({ minLength: 6 }),
			}),
		},
	)

	.put(
		"/manager/:manager_id/supervisors/:supervisor_id",
		async ({ params, body, set }) => {
			const manager_record = await db.query.users.findFirst({
				where: eq(schema.users.id, params.manager_id),
			});

			if (!manager_record || manager_record.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const existing_user = await db.query.users.findFirst({
				where: eq(schema.users.id, params.supervisor_id),
			});

			if (!existing_user || existing_user.role !== "supervisor") {
				set.status = 404;
				return { error: "Supervisor not found." };
			}

			try {
				const normalized_email = normalizeSupervisorEmail(body.email);

				const update_payload: {
					fullName: string;
					email: string;
					passwordHash?: string;
				} = {
					fullName: body.full_name,
					email: normalized_email,
				};

				if (body.password && body.password.trim().length > 0) {
					update_payload.passwordHash = await Bun.password.hash(body.password);
				}

				const [updated_user] = await db
					.update(schema.users)
					.set(update_payload)
					.where(eq(schema.users.id, params.supervisor_id))
					.returning({
						id: schema.users.id,
						fullName: schema.users.fullName,
						email: schema.users.email,
						role: schema.users.role,
						createdAt: schema.users.createdAt,
					});

				return { success: true, user: updated_user };
			} catch (error) {
				set.status = 400;
				return {
					error: "Could not update supervisor. Email may already exist.",
				};
			}
		},
		{
			params: t.Object({
				manager_id: t.String(),
				supervisor_id: t.String(),
			}),
			body: t.Object({
				full_name: t.String(),
				email: t.String(),
				password: t.Optional(t.String()),
			}),
		},
	)

	.delete(
		"/manager/:manager_id/supervisors/:supervisor_id",
		async ({ params, set }) => {
			const manager_record = await db.query.users.findFirst({
				where: eq(schema.users.id, params.manager_id),
			});

			if (!manager_record || manager_record.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const existing_user = await db.query.users.findFirst({
				where: eq(schema.users.id, params.supervisor_id),
			});

			if (!existing_user || existing_user.role !== "supervisor") {
				set.status = 404;
				return { error: "Supervisor not found." };
			}

			await db.transaction(async (tx) => {
				await tx
					.update(schema.auditLogs)
					.set({ supervisorId: null })
					.where(eq(schema.auditLogs.supervisorId, params.supervisor_id));

				await tx
					.delete(schema.users)
					.where(eq(schema.users.id, params.supervisor_id));
			});

			return { success: true };
		},
		{
			params: t.Object({
				manager_id: t.String(),
				supervisor_id: t.String(),
			}),
		},
	)

	.get("/manager/:manager_id/sites-supervisors", async ({ params, set }) => {
		const manager_record = await db.query.users.findFirst({
			where: eq(schema.users.id, params.manager_id),
		});

		if (!manager_record || manager_record.role !== "manager") {
			set.status = 403;
			return { error: "Forbidden: manager access required." };
		}

		const managed_sites = await db.query.sites.findMany({
			where: eq(schema.sites.managerId, params.manager_id),
			with: {
				supervisors: {
					with: {
						supervisor: {
							columns: {
								id: true,
								fullName: true,
								email: true,
								role: true,
							},
						},
					},
				},
			},
		});

		const available_supervisors = await db.query.users.findMany({
			where: eq(schema.users.role, "supervisor"),
			columns: {
				id: true,
				fullName: true,
				email: true,
				role: true,
			},
		});

		return {
			success: true,
			sites: managed_sites,
			supervisors: available_supervisors,
		};
	})

	.post(
		"/manager/assign-supervisors",
		async ({ body, set }) => {
			const manager_record = await db.query.users.findFirst({
				where: eq(schema.users.id, body.manager_id),
			});

			if (!manager_record || manager_record.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const managed_site = await db.query.sites.findFirst({
				where: and(
					eq(schema.sites.id, body.site_id),
					eq(schema.sites.managerId, body.manager_id),
				),
			});

			if (!managed_site) {
				set.status = 404;
				return { error: "Site not found for this manager." };
			}

			const supervisor_ids = Array.from(new Set(body.supervisor_ids));

			if (supervisor_ids.length > 0) {
				const matching_supervisors = await db.query.users.findMany({
					where: and(
						inArray(schema.users.id, supervisor_ids),
						eq(schema.users.role, "supervisor"),
					),
					columns: { id: true },
				});

				if (matching_supervisors.length !== supervisor_ids.length) {
					set.status = 400;
					return {
						error: "One or more selected users are not valid supervisors.",
					};
				}
			}

			await db.transaction(async (tx) => {
				await tx
					.delete(schema.siteSupervisors)
					.where(eq(schema.siteSupervisors.siteId, body.site_id));

				if (supervisor_ids.length > 0) {
					await tx.insert(schema.siteSupervisors).values(
						supervisor_ids.map((id_val) => ({
							siteId: body.site_id,
							supervisorId: id_val,
						})),
					);
				}
			});

			return { success: true, assignedCount: supervisor_ids.length };
		},
		{
			body: t.Object({
				manager_id: t.String(),
				site_id: t.String(),
				supervisor_ids: t.Array(t.String()),
			}),
		},
	)

	.listen(3000);

const route_table = (app.routes as Array<{ method: string; path: string }>).map(
	(route) => `${route.method} ${route.path}`,
);

console.log(
	`🚀 FluxFlow Elysia server running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(route_table.join("\n"));
