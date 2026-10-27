"use client";

import { FormEvent, useState } from "react";
import { CircleUserRound, KeyRound, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignInCard({ passwordConfigured, githubConfigured, defaultEmail }: { passwordConfigured: boolean; githubConfigured: boolean; defaultEmail: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL: "/admin" });
      if (result.error) setError(result.error.message ?? "Email and password sign-in failed.");
    } catch {
      setError("The sign-in service could not be reached.");
    } finally {
      setPending(false);
    }
  }

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({ provider: "github", callbackURL: "/admin" });
      if (result.error) setError(result.error.message ?? "GitHub sign-in failed.");
    } catch {
      setError("The GitHub sign-in service could not be reached.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-card" aria-labelledby="admin-sign-in-title">
        <div className="eyebrow">Protected control plane</div>
        <h1 id="admin-sign-in-title">Codefyhub administration</h1>
        <p>Use your protected administrator credentials. Every content change is revisioned and audited.</p>
        <form className="admin-login-form" onSubmit={signInWithPassword}>
          <label>Administrator email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required disabled={!passwordConfigured || pending} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={!passwordConfigured || pending} /></label>
          <button type="submit" className="admin-primary-button" disabled={!passwordConfigured || pending}>
            {pending ? <LoaderCircle size={18} className="admin-spin" /> : <KeyRound size={18} />} Sign in
          </button>
        </form>
        {githubConfigured && <>
          <div className="admin-login-divider">or</div>
          <button type="button" className="admin-secondary-button" onClick={signIn} disabled={pending}>
          {pending ? <LoaderCircle size={18} className="admin-spin" /> : <CircleUserRound size={18} />}
          Continue with GitHub
        </button>
        </>}
        {!passwordConfigured && <div className="admin-setup-note" role="status"><strong>Login setup is incomplete.</strong><span>Add <code>BETTER_AUTH_SECRET</code>, <code>BETTER_AUTH_URL</code>, and <code>ADMIN_EMAILS</code> to the deployment environment, then redeploy.</span></div>}
        {error && <p className="admin-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
