// Existing public URLs belong to one explicitly selected company. Other
// companies remain available through their authenticated portal.
export function publicCompanyId() {
  return process.env.PUBLIC_COMPANY_ID?.trim() || "codefyhub-company";
}

export function publicCompanyWhere() {
  return { id: publicCompanyId(), isPublic: true, status: "ACTIVE" as const };
}
