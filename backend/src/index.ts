import { Elysia, t } from "elysia";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq } from "drizzle-orm";
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
		app.get("/", async () => {
			return await db.query.assetInstances.findMany({
				with: {
					type: true, // Pulls model_name, manufacturer
					site: true, // Pulls site name
					room: true, // Pulls current location label
				},
			});
		}),
	)

	.listen(3000);

console.log(
	`🚀 FluxFlow Elysia server running at ${app.server?.hostname}:${app.server?.port}`,
);
