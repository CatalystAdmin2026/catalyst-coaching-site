import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./lib/db/schema.ts", "./lib/db/schema-profile.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
