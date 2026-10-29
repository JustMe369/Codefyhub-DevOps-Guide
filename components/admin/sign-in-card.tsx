"use client";

import { FormEvent, useState } from "react";
import { CircleUserRound, KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type SignInCardProps = {
  passwordConfigured: boolean;
  githubConfigured: boolean;
  defaultEmail: string;
  callbackURL?: "/admin" | "/portal";
  eyebrow?: string;
  title?: string;
  description?: string;
  emailLabel?: string;
  setupMessage?: string;
  notice?: string;
};

export function SignInCard({
  passwordConfigured,
  githubConfigured,
  defaultEmail,
  callbackURL = "/admin",
  eyebrow = "Protected control plane",
  title = "Codefyhub administration",
  description = "Use your protected administrator credentials. Every content change is revisioned and audited.",
  emailLabel = "Administrator email",
  setupMessage = "Add BETTER_AUTH_SECRET and BETTER_AUTH_URL to the deployment environment, then redeploy.",
  notice,
}: SignInCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");

  async function signInWithPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL });
      if (result.error) {
        setError(result.error.message ?? "Email and password sign-in failed.");
      } else {
        router.replace(callbackURL);
        router.refresh();
      }
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
      const result = await authClient.signIn.social({ provider: "github", callbackURL });
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
        <div className="eyebrow">{eyebrow}</div>
        <h1 id="admin-sign-in-title">{title}</h1>
        <p>{description}</p>
        {notice && <div className="admin-setup-note admin-notice" role="status"><strong>Account updated</strong><span>{notice}</span></div>}
        <form className="admin-login-form" onSubmit={signInWithPassword}>
          <label>{emailLabel}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required disabled={!passwordConfigured || pending} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={!passwordConfigured || pending} /></label>
          <button type="button" onClick={() => signInWithPassword()} className="admin-primary-button" disabled={!passwordConfigured || pending}>
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
        {!passwordConfigured && <div className="admin-setup-note" role="status"><strong>Login setup is incomplete.</strong><span>{setupMessage}</span></div>}
        {error && <p className="admin-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
