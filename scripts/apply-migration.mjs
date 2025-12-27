import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

// Load env from server/.env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const migrationFile = path.join(__dirname, '../migrations/001_create_ibge_sectors.sql');

async function migrate() {
    console.log("🔌 Connecting to DB...");
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log("✅ Connected. Reading migration file...");

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log("🚀 Executing migration...");

        await client.query(sql);
        console.log("✅ Migration applied successfully!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
