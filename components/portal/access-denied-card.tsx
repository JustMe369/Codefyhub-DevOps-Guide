"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AccessDeniedCard() {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.replace("/portal/sign-in");
    router.refresh();
  }
  return <main className="admin-auth-shell"><section className="admin-auth-card"><div className="eyebrow">Company access required</div><h1>Your account is signed in</h1><p>This account does not have an active company membership with knowledge-view permission. Ask a company administrator to activate your membership or assign the Viewer role.</p><button className="admin-secondary-button" type="button" onClick={signOut}><LogOut size={18} /> Sign in with another account</button></section></main>;
}
