import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInCard } from "@/components/admin/sign-in-card";
import { getAuth } from "@/lib/auth";
import { getPortalIdentity } from "@/lib/portal/knowledge";

export default async function PortalSignInPage() {
  const requestHeaders = await headers();
  const identity = await getPortalIdentity(requestHeaders);
  if (identity) redirect("/portal");
  if (process.env.BETTER_AUTH_SECRET) {
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    if (session) redirect("/portal/access-denied");
  }
  return <SignInCard
    passwordConfigured={Boolean(process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL)}
    githubConfigured={Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)}
    defaultEmail=""
    callbackURL="/portal"
    eyebrow="Private company workspace"
    title="Open your knowledge bank"
    description="Sign in with the account invited by your company administrator. Your workflows, answers, policies, and solutions remain isolated from every other company."
    emailLabel="Company email"
    setupMessage="Ask the platform administrator to complete the authentication environment configuration."
  />;
}
