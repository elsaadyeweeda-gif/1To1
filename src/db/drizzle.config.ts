import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables for local testing / build script
dotenv.config();

const sqlHost = process.env['SQL_HOST'];
const sqlDbName = process.env['SQL_DB_NAME'];
const user = process.env['SQL_ADMIN_USER'];
const password = process.env['SQL_ADMIN_PASSWORD'];

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost || "",
    user: user || "",
    password: password || "",
    database: sqlDbName || "",
    ssl: false, // Set to true if connecting to a database requiring SSL
  },
  verbose: true,
});
