import { Suspense } from "react";
import { AcceptInviteCard } from "@/components/admin/accept-invite-card";

export default function AcceptInvitePage() {
  return <main className="admin-auth-shell"><Suspense fallback={<section className="admin-auth-card"><p>Loading invitation…</p></section>}><AcceptInviteCard /></Suspense></main>;
}
