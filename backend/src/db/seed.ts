import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

const client = new Client({
	connectionString: process.env.DATABASE_URL,
});

async function seed() {
	await client.connect();
	const db = drizzle(client, { schema });

	console.log("🌱 Cleaning old data...");
	// Optional: Clear existing users to avoid unique email conflicts during testing
	await db.delete(schema.users);

	console.log("👤 Creating the first Manager...");

	// Securely hash the password using Bun's native tool
	const password = "SuperSecurePassword123";
	const hash = await Bun.password.hash(password);

	const newUser = await db
		.insert(schema.users)
		.values({
			fullName: "The Chosen One",
			email: "admin@fluxflow.com",
			passwordHash: hash,
			role: "manager",
		})
		.returning();

	console.log("✅ Seed Successful!");
	console.log(`ID: ${newUser[0].id}`);
	console.log(`Email: ${newUser[0].email}`);

	await client.end();
}

seed().catch(console.error);
