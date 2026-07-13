import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./lib/db/schema.ts",
    "./lib/db/schema-profile.ts",
    "./lib/db/schema-exercise.ts",
    "./lib/db/schema-program.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
