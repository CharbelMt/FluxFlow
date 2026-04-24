import { Elysia, t } from "elysia";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { and, eq, inArray } from "drizzle-orm";
import { jwt } from "@elysiajs/jwt";
import * as schema from "./db/schema";
import cors from "@elysiajs/cors";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = drizzle(client, { schema });

const app = new Elysia()
	.use(
		cors({
			origin: "http://localhost:9300",
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	)

	.use(
		jwt({
			name: "jwt",
			secret: process.env.JWT_SECRET || "FORGE_A_BETTER_SECRET_THAN_THIS",
		}),
	)

	.get("/test-db", async () => {
		const all_sites = await db.query.sites.findMany();
		return { message: "Connection Secure!", count: all_sites.length };
	})

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
		"/users",
		async ({ body, set }) => {
			const creator_record = await db.query.users.findFirst({
				where: eq(schema.users.id, body.admin_id),
			});

			if (!creator_record || creator_record.role !== "admin") {
				set.status = 403;
				return { error: "Forbidden: Only admins can create users." };
			}

			const temporary_hash = await Bun.password.hash(body.password);

			try {
				const new_user = await db
					.insert(schema.users)
					.values({
						fullName: body.full_name,
						email: body.email,
						passwordHash: temporary_hash,
						role: body.role,
					})
					.returning();

				if (!new_user[0]) {
					set.status = 400;
					return { error: "Failed to create user." };
				}

				const { passwordHash, ...safe_user } = new_user[0];
				return { success: true, user: safe_user };
			} catch (err) {
				set.status = 400;
				return { error: "Could not create user. Email might already exist." };
			}
		},
		{
			body: t.Object({
				admin_id: t.String(),
				full_name: t.String(),
				email: t.String(),
				password: t.String(),
				role: t.Union([
					t.Literal("admin"),
					t.Literal("manager"),
					t.Literal("supervisor"),
				]),
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
			),
	)

	.post(
		"/sites/:siteId/storage-rooms",
		async ({ params, body, set }) => {
			const existing_site = await db.query.sites.findFirst({
				where: eq(schema.sites.id, params.siteId),
			});

			if (!existing_site) {
				set.status = 404;
				return { error: "Site not found." };
			}

			const new_room = await db
				.insert(schema.storageRooms)
				.values({
					siteId: params.siteId,
					roomLabel: body.room_label,
					roomTagUid: body.room_tag_uid,
				})
				.returning();

			return { success: true, room: new_room[0] };
		},
		{
			params: t.Object({
				siteId: t.String(),
			}),
			body: t.Object({
				room_label: t.String(),
				room_tag_uid: t.String(),
			}),
		},
	)

	.group("/storage-rooms", (app) =>
		app
			// NEW: Added endpoint to fetch a single room when scanned
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

			.post(
				"/",
				async ({ body }) => {
					const new_room = await db
						.insert(schema.storageRooms)
						.values({
							siteId: body.site_id,
							roomLabel: body.room_label,
							roomTagUid: body.room_tag_uid,
						})
						.returning();

					return { success: true, room: new_room[0] };
				},
				{
					body: t.Object({
						site_id: t.String(),
						room_label: t.String(),
						room_tag_uid: t.String(),
					}),
				},
			),
	)

	.group("/assets", (app) =>
		app
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

			.post(
				"/bulk",
				async ({ body, set }) => {
					try {
						return await db.transaction(async (tx) => {
							let type_id = body.type_id;

							if (!type_id && body.new_type) {
								const [new_type] = await tx
									.insert(schema.assetTypes)
									.values({
										modelName: body.new_type.model_name,
										manufacturer: body.new_type.manufacturer,
										category: body.new_type.category,
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
								category: t.String(),
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

			try {
				const [created_user] = await db
					.insert(schema.users)
					.values({
						fullName: body.full_name,
						email: body.email,
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
				const update_payload: {
					fullName: string;
					email: string;
					passwordHash?: string;
				} = {
					fullName: body.full_name,
					email: body.email,
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

	.get("/manager/:manager_id/sites-supervisors", async ({ params, set }) => {
		const manager_record = await db.query.users.findFirst({
			where: eq(schema.users.id, params.manager_id),
		});

		if (!manager_record || manager_record.role !== "manager") {
			set.status = 403;
			return { error: "Forbidden: manager access required." };
		}

		const [managed_sites, available_supervisors] = await Promise.all([
			db.query.sites.findMany({
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
			}),
			db.query.users.findMany({
				where: eq(schema.users.role, "supervisor"),
				columns: {
					id: true,
					fullName: true,
					email: true,
					role: true,
				},
			}),
		]);

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
