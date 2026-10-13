import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations need a direct (non-pooled) connection. If DIRECT_URL is not set we
// derive it from the pooled Neon URL by dropping the "-pooler" host suffix.
const pooled = process.env.DATABASE_URL ?? "";
const direct = process.env.DIRECT_URL || pooled.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // A placeholder keeps `prisma generate` working before .env is filled in.
    url: direct || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
