import Link from "next/link";

export default function NotFound() {
  return <div className="shell page-hero"><div className="eyebrow">404 · Route not found</div><h1>This runbook page does not exist.</h1><p>The guide may have moved. Return to the architecture map or search for the topic.</p><div className="hero-actions"><Link href="/" className="button button-primary">Return home</Link><Link href="/search" className="button">Search guide</Link></div></div>;
}
