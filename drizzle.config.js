export default {
  dialect: "postgresql",
  schema: "./utils/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "postgresql://neondb_owner:wZBudbgrkL13@ep-winter-pond-a1xcbvo2.ap-southeast-1.aws.neon.tech/content-db?sslmode=require",
    connectionString:
      "postgresql://neondb_owner:wZBudbgrkL13@ep-winter-pond-a1xcbvo2.ap-southeast-1.aws.neon.tech/content-db?sslmode=require",
  },
};
