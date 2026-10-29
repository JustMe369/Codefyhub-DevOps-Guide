"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function AcceptInviteCard() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.password !== values.confirmPassword) return setMessage("Passwords do not match.");
    setPending(true);
    const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: values.password }) });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) return setMessage(payload.error ?? "The invitation could not be accepted.");
    setComplete(true);
    setMessage(`Your ${payload.company} account is ready.`);
  }

  return <section className="admin-auth-card"><div className="eyebrow">Secure company invitation</div><h1>Join the knowledge bank</h1><p>{message || "Choose a private password to activate your company access."}</p>{complete ? <Link className="admin-primary-button" href="/portal/sign-in">Continue to company sign in</Link> : <form className="admin-login-form" onSubmit={accept}><label>Password<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label><label>Confirm password<input name="confirmPassword" type="password" minLength={12} required autoComplete="new-password" /></label><button className="admin-primary-button" disabled={pending || token.length < 32}>{pending ? "Activating…" : "Activate account"}</button></form>}</section>;
}
