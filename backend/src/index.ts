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
			origin: "http://localhost:9000",
		}),
	)

	.use(
		jwt({
			name: "jwt",
			secret: process.env.JWT_SECRET || "FORGE_A_BETTER_SECRET_THAN_THIS",
		}),
	)

	.get("/test-db", async () => {
		const allSites = await db.query.sites.findMany();
		return { message: "Connection Secure!", count: allSites.length };
	})

	.post(
		"/login",
		async ({ body, set, jwt }) => {
			const userRecord = await db.query.users.findFirst({
				where: eq(schema.users.email, body.email),
			});

			if (
				!userRecord ||
				!(await Bun.password.verify(body.password, userRecord.passwordHash))
			) {
				set.status = 401;
				return { error: "Invalid credentials" };
			}

			const token = await jwt.sign({
				sub: userRecord.id,
				role: userRecord.role,
			});

			const { passwordHash, ...safeUser } = userRecord;
			return {
				success: true,
				token,
				user: safeUser,
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
			const creator = await db.query.users.findFirst({
				where: eq(schema.users.id, body.admin_id),
			});

			if (!creator || creator.role !== "admin") {
				set.status = 403;
				return { error: "Forbidden: Only admins can create users." };
			}

			const temporaryHash = await Bun.password.hash(body.password);

			try {
				const newUser = await db
					.insert(schema.users)
					.values({
						fullName: body.full_name,
						email: body.email,
						passwordHash: temporaryHash,
						role: body.role,
					})
					.returning();

				if (!newUser[0]) {
					set.status = 400;
					return { error: "Failed to create user." };
				}

				const { passwordHash, ...safeUser } = newUser[0];
				return { success: true, user: safeUser };
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
					const newSite = await db
						.insert(schema.sites)
						.values({
							name: body.name,
							locationGps: body.location_gps,
							managerId: body.manager_id,
						})
						.returning();

					return { success: true, site: newSite[0] };
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
				"/:siteId",
				async ({ params, body, set }) => {
					const site = await db.query.sites.findFirst({
						where: eq(schema.sites.id, params.siteId),
					});

					if (!site) {
						set.status = 404;
						return { error: "Site not found." };
					}

					const [updatedSite] = await db
						.update(schema.sites)
						.set({
							name: body.name,
							locationGps: body.location_gps,
							managerId: body.manager_id,
						})
						.where(eq(schema.sites.id, params.siteId))
						.returning();

					return { success: true, site: updatedSite };
				},
				{
					params: t.Object({
						siteId: t.String(),
					}),
					body: t.Object({
						name: t.String(),
						location_gps: t.Optional(t.String()),
						manager_id: t.String(),
					}),
				},
			),
	)

	.group("/storage-rooms", (app) =>
		app.post(
			"/",
			async ({ body }) => {
				const newRoom = await db
					.insert(schema.storageRooms)
					.values({
						siteId: body.site_id,
						roomLabel: body.room_label,
						roomTagUid: body.room_tag_uid,
					})
					.returning();

				return { success: true, room: newRoom[0] };
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

			.post(
				"/bulk",
				async ({ body, set }) => {
					try {
						return await db.transaction(async (tx) => {
							let typeId = body.type_id;

							if (!typeId && body.new_type) {
								const [newType] = await tx
									.insert(schema.assetTypes)
									.values({
										modelName: body.new_type.model_name,
										manufacturer: body.new_type.manufacturer,
										category: body.new_type.category,
										maintenanceIntervalHrs:
											body.new_type.maintenance_interval_hrs,
									})
									.returning();

								if (!newType) {
									set.status = 400;
									return { error: "Failed to create asset type" };
								}

								typeId = newType.id;
							}

							if (!typeId) {
								set.status = 400;
								return { error: "Missing type_id or new_type definition" };
							}

							const instancesToInsert = body.serial_numbers.map((sn) => ({
								typeId: typeId!,
								serialNumber: sn,
								assignedSiteId: body.site_id,
								currentRoomId: body.room_id,
								status: "on_site",
							}));

							const createdInstances = await tx
								.insert(schema.assetInstances)
								.values(instancesToInsert)
								.returning();

							return {
								success: true,
								count: createdInstances.length,
								instances: createdInstances,
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

	.get("/manager/:managerId/supervisors", async ({ params, set }) => {
		const manager = await db.query.users.findFirst({
			where: eq(schema.users.id, params.managerId),
		});

		if (!manager || manager.role !== "manager") {
			set.status = 403;
			return { error: "Forbidden: manager access required." };
		}

		const supervisors = await db.query.users.findMany({
			where: eq(schema.users.role, "supervisor"),
			columns: {
				id: true,
				fullName: true,
				email: true,
				role: true,
				createdAt: true,
			},
		});

		return { success: true, supervisors };
	})

	.post(
		"/manager/:managerId/supervisors",
		async ({ params, body, set }) => {
			const manager = await db.query.users.findFirst({
				where: eq(schema.users.id, params.managerId),
			});

			if (!manager || manager.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const passwordHash = await Bun.password.hash(body.password);

			try {
				const [createdUser] = await db
					.insert(schema.users)
					.values({
						fullName: body.full_name,
						email: body.email,
						passwordHash,
						role: "supervisor",
					})
					.returning({
						id: schema.users.id,
						fullName: schema.users.fullName,
						email: schema.users.email,
						role: schema.users.role,
						createdAt: schema.users.createdAt,
					});

				return { success: true, user: createdUser };
			} catch (error) {
				set.status = 400;
				return {
					error: "Could not create supervisor. Email may already exist.",
				};
			}
		},
		{
			params: t.Object({
				managerId: t.String(),
			}),
			body: t.Object({
				full_name: t.String(),
				email: t.String(),
				password: t.String({ minLength: 6 }),
			}),
		},
	)

	.put(
		"/manager/:managerId/supervisors/:supervisorId",
		async ({ params, body, set }) => {
			const manager = await db.query.users.findFirst({
				where: eq(schema.users.id, params.managerId),
			});

			if (!manager || manager.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const existingUser = await db.query.users.findFirst({
				where: eq(schema.users.id, params.supervisorId),
			});

			if (!existingUser || existingUser.role !== "supervisor") {
				set.status = 404;
				return { error: "Supervisor not found." };
			}

			try {
				const updatePayload: {
					fullName: string;
					email: string;
					passwordHash?: string;
				} = {
					fullName: body.full_name,
					email: body.email,
				};

				if (body.password && body.password.trim().length > 0) {
					updatePayload.passwordHash = await Bun.password.hash(body.password);
				}

				const [updatedUser] = await db
					.update(schema.users)
					.set(updatePayload)
					.where(eq(schema.users.id, params.supervisorId))
					.returning({
						id: schema.users.id,
						fullName: schema.users.fullName,
						email: schema.users.email,
						role: schema.users.role,
						createdAt: schema.users.createdAt,
					});

				return { success: true, user: updatedUser };
			} catch (error) {
				set.status = 400;
				return {
					error: "Could not update supervisor. Email may already exist.",
				};
			}
		},
		{
			params: t.Object({
				managerId: t.String(),
				supervisorId: t.String(),
			}),
			body: t.Object({
				full_name: t.String(),
				email: t.String(),
				password: t.Optional(t.String()),
			}),
		},
	)

	.get("/manager/:managerId/sites-supervisors", async ({ params, set }) => {
		const manager = await db.query.users.findFirst({
			where: eq(schema.users.id, params.managerId),
		});

		if (!manager || manager.role !== "manager") {
			set.status = 403;
			return { error: "Forbidden: manager access required." };
		}

		const [sites, supervisors] = await Promise.all([
			db.query.sites.findMany({
				where: eq(schema.sites.managerId, params.managerId),
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

		return { success: true, sites, supervisors };
	})

	.post(
		"/manager/assign-supervisors",
		async ({ body, set }) => {
			const manager = await db.query.users.findFirst({
				where: eq(schema.users.id, body.manager_id),
			});

			if (!manager || manager.role !== "manager") {
				set.status = 403;
				return { error: "Forbidden: manager access required." };
			}

			const managedSite = await db.query.sites.findFirst({
				where: and(
					eq(schema.sites.id, body.site_id),
					eq(schema.sites.managerId, body.manager_id),
				),
			});

			if (!managedSite) {
				set.status = 404;
				return { error: "Site not found for this manager." };
			}

			const supervisorIds = Array.from(new Set(body.supervisor_ids));

			if (supervisorIds.length > 0) {
				const matchingSupervisors = await db.query.users.findMany({
					where: and(
						inArray(schema.users.id, supervisorIds),
						eq(schema.users.role, "supervisor"),
					),
					columns: { id: true },
				});

				if (matchingSupervisors.length !== supervisorIds.length) {
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

				if (supervisorIds.length > 0) {
					await tx.insert(schema.siteSupervisors).values(
						supervisorIds.map((supervisorId) => ({
							siteId: body.site_id,
							supervisorId,
						})),
					);
				}
			});

			return { success: true, assignedCount: supervisorIds.length };
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

const routeTable = (app.routes as Array<{ method: string; path: string }>).map(
	(route) => `${route.method} ${route.path}`,
);

console.log(
	`🚀 FluxFlow Elysia server running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(routeTable.join("\n"));
