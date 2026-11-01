export type SourceSyncDecision = "ADOPT" | "UPDATE" | "PRESERVE_ADMIN" | "PRESERVE_MODIFIED" | "MARK_CONFLICT";

export function decideSourceSync(input: {
  origin: "ADMIN" | "SOURCE" | "IMPORT" | "CONNECTOR";
  syncStatus: "NOT_APPLICABLE" | "IN_SYNC" | "MODIFIED" | "CONFLICT";
  contentChanged: boolean;
  previousSourceHash: string | null;
  nextSourceHash: string;
}): SourceSyncDecision {
  if (input.origin !== "SOURCE") return input.contentChanged ? "PRESERVE_ADMIN" : "ADOPT";
  if (input.syncStatus === "MODIFIED" || input.syncStatus === "CONFLICT") {
    return input.previousSourceHash === input.nextSourceHash ? "PRESERVE_MODIFIED" : "MARK_CONFLICT";
  }
  return "UPDATE";
}
