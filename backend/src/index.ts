import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./db/schema";

const client = new Client({
	connectionString: process.env.DATABASE_URL,
});

await client.connect();
const db = drizzle(client, { schema });

const server = Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);

		// A simple test route to see if the DB is talking to us
		if (url.pathname === "/test-db") {
			try {
				const allSites = await db.query.sites.findMany();
				return Response.json({
					message: "Connection Secure!",
					siteCount: allSites.length,
				});
			} catch (err) {
				return Response.json({ error: String(err) }, { status: 500 });
			}
		}

		return new Response("FluxFlow Backend is Online.");
	},
});

console.log(`🚀 FluxFlow server running at http://localhost:${server.port}`);
