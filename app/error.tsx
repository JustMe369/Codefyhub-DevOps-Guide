"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error("Guide route failed", error.digest); }, [error]);
  return <main className="shell page-hero"><div className="eyebrow">Temporary service issue</div><h1>The guide is unavailable right now.</h1><p>Check that the local PostgreSQL service is running, then try the route again.</p><button className="button button-primary" onClick={retry} type="button">Try again</button></main>;
}
