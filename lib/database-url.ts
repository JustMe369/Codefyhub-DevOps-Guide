const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

/**
 * pg currently treats these legacy SSL modes as verify-full, but its next
 * major version will not. Make the existing secure behavior explicit and
 * prevent the compatibility warning from polluting production error logs.
 */
export function normalizePostgresConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  if (sslMode && LEGACY_SSL_MODES.has(sslMode) && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
