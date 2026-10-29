import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SignInCard } from "@/components/admin/sign-in-card";
import { getAdminIdentity } from "@/lib/admin/authz";

export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<{ emailChanged?: string }> }) {
  if (await getAdminIdentity(await headers())) redirect("/admin");
  const params = await searchParams;
  const passwordConfigured = Boolean(
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL,
  );
  const githubConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return <SignInCard passwordConfigured={passwordConfigured} githubConfigured={githubConfigured} defaultEmail="" notice={params.emailChanged === "1" ? "Administrator email updated. Sign in again with the new email address and your existing password." : undefined} />;
}
