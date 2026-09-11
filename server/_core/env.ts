// HP runs as a private, single-owner app with no sign-in flow: every request
// is treated as this fixed local owner. There is no hosted auth service and
// no OAuth server to configure.
export const ENV = {
  ownerOpenId: process.env.OWNER_OPEN_ID || "local-owner",
  ownerName: process.env.OWNER_NAME || "Shashank Goyal",
  isProduction: process.env.NODE_ENV === "production",
  // Path to the local SQLite database file. Relative paths resolve from the
  // project root. Override with DATABASE_URL if you want the file stored
  // somewhere else.
  databasePath: process.env.DATABASE_URL || "./data/hp.db",
  // Directory where uploaded health-report PDFs are stored locally.
  uploadsDir: process.env.UPLOADS_DIR || "./data/uploads",
};
