import Link from "next/link";
import { Search, TerminalSquare } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark"><TerminalSquare size={17} aria-hidden="true" /></span>
          <span>Codefyhub-DevOps Guide<small>Infrastructure operations</small></span>
        </Link>
        <nav className="main-nav" aria-label="Primary navigation">
          <Link href="/guides/start-here">Guides</Link>
          <Link href="/glossary">Glossary</Link>
          <Link href="/checklist">Readiness</Link>
        </nav>
        <form className="search-form" action="/search" role="search">
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="global-search">Search the guide</label>
          <input id="global-search" className="search-input" name="q" type="search" placeholder="Search the field guide…" />
        </form>
      </div>
    </header>
  );
}
