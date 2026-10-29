export function isTrustedMutationOrigin(request: Request, additionalOrigins: Array<string | undefined> = []) {
  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  if (!origin) return false;
  const allowed = new Set([
    new URL(request.url).origin,
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    ...additionalOrigins,
    ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
  ].filter((value): value is string => Boolean(value)).map((value) => value.replace(/\/$/, "")));
  return allowed.has(origin);
}
