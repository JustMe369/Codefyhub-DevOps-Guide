"use client";

import { useState } from "react";
import { CircleUserRound, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignInCard({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.social({ provider: "github", callbackURL: "/admin" });
    if (result.error) {
      setError(result.error.message ?? "GitHub sign-in failed.");
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card" aria-labelledby="admin-sign-in-title">
        <div className="eyebrow">Protected control plane</div>
        <h1 id="admin-sign-in-title">Codefyhub administration</h1>
        <p>Sign in with your explicitly allowlisted GitHub identity. Every content change is revisioned and audited.</p>
        <button type="button" className="admin-primary-button" onClick={signIn} disabled={!configured || pending}>
          {pending ? <LoaderCircle size={18} className="admin-spin" /> : <CircleUserRound size={18} />}
          Continue with GitHub
        </button>
        {!configured && <div className="admin-setup-note" role="status"><strong>Login setup is incomplete.</strong><span>Add <code>BETTER_AUTH_SECRET</code>, <code>BETTER_AUTH_URL</code>, <code>GITHUB_CLIENT_ID</code>, <code>GITHUB_CLIENT_SECRET</code>, and <code>ADMIN_EMAILS</code> to the deployment environment, then redeploy.</span></div>}
        {error && <p className="admin-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
