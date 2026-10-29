"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BookOpenCheck, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type QuickResult = { id: string; title: string; articleSlug: string; sectionSlug: string; sectionTitle: string; kind: "article" | "glossary"; contentType: string };

const themeEvent = "codefyhub:theme-change";

function subscribeToTheme(callback: () => void) {
  window.addEventListener(themeEvent, callback);
  return () => window.removeEventListener(themeEvent, callback);
}

function getThemeSnapshot(): "dark" | "light" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): "dark" | "light" {
  return "dark";
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("devops-guide:theme");
    } catch {
      saved = null;
    }
    const preferred =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    document.documentElement.dataset.theme = preferred;
    window.dispatchEvent(new Event(themeEvent));
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setMenuOpen(false); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);
  useEffect(() => {
    function onGlobalSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setActiveResult(-1);
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onGlobalSearch);
    return () => window.removeEventListener("keydown", onGlobalSearch);
  }, [searchOpen]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        setResults(response.ok ? data.results : []);
        setActiveResult(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally { if (!controller.signal.aborted) setSearchLoading(false); }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("devops-guide:theme", next);
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(themeEvent));
  }
  function closeMenu() { setMenuOpen(false); }
  if (pathname === "/portal" || pathname?.startsWith("/portal/knowledge")) return null;
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Codefyhub-DevOps Guide home">
          <span className="brand-mark"><Image src="/brand/Codefyhub-DevOps-g.jpg" alt="Codefyhub-DevOps logo" width={31} height={31} priority /></span>
          <span className="brand-copy">Codefyhub <b>DevOps</b><small>Engineering knowledge bank</small></span>
        </Link>
        <button className="header-icon menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <nav id="primary-navigation" className={`main-nav${menuOpen ? " open" : ""}`} aria-label="Primary navigation">
          <Link onClick={closeMenu} href="/guides/start-here">Guides</Link>
          <Link onClick={closeMenu} href="/configurations">Configs</Link>
          <Link onClick={closeMenu} href="/exam">Exam</Link>
          <Link onClick={closeMenu} href="/glossary">Glossary</Link>
          <Link onClick={closeMenu} href="/checklist">Readiness</Link>
          <Link onClick={closeMenu} className="portal-nav-link" href="/portal"><BookOpenCheck size={15} /> Company Portal <ArrowUpRight size={13} /></Link>
        </nav>
        <div className="header-tools"><button className="header-icon theme-toggle" type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <form className="search-form" action="/search" method="get" role="search">
          <Search size={16} aria-hidden="true" />
          <fieldset className="search-input-field">
          <label className="sr-only" htmlFor="global-search">Search the guide</label>
          <input ref={searchRef} id="global-search" className="search-input" name="q" type="search" role="combobox" placeholder="Search the field guide…" value={query} autoComplete="off" aria-autocomplete="list" aria-controls="quick-search-results" aria-expanded={searchOpen} aria-activedescendant={activeResult >= 0 ? `quick-result-${activeResult}` : undefined} onFocus={() => setSearchOpen(true)} onChange={(event) => { const next = event.target.value; setQuery(next); setSearchOpen(true); if (next.trim().length < 2) { setResults([]); setSearchLoading(false); setActiveResult(-1); } }} onKeyDown={(event) => {
            if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setActiveResult((current) => Math.min(current + 1, results.length - 1)); }
            if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActiveResult((current) => Math.max(current - 1, 0)); }
            if (event.key === "Enter" && activeResult >= 0) { event.preventDefault(); const result = results[activeResult]; setSearchOpen(false); router.push(result.kind === "glossary" ? `/glossary#${result.id}` : `/guides/${result.sectionSlug}/${result.articleSlug}`); }
          }} />
          </fieldset>
          <kbd aria-hidden="true">⌘K</kbd>
          {searchOpen && query.trim().length >= 2 && <div id="quick-search-results" className="quick-search-results" role="listbox" aria-label="Search suggestions">
            {searchLoading && <div className="quick-search-state">Searching…</div>}
            {!searchLoading && results.length === 0 && <div className="quick-search-state">No matches. Press Enter for full search.</div>}
            {!searchLoading && results.map((result, index) => <Link id={`quick-result-${index}`} role="option" aria-selected={activeResult === index} className={activeResult === index ? "active" : ""} href={result.kind === "glossary" ? `/glossary#${result.id}` : `/guides/${result.sectionSlug}/${result.articleSlug}`} onClick={() => setSearchOpen(false)} key={`${result.kind}-${result.id}`}><span>{result.sectionTitle} · {result.contentType.toLowerCase().replaceAll("_", " ")}</span><strong>{result.title}</strong></Link>)}
            <Link className="quick-search-all" href={`/search?q=${encodeURIComponent(query)}`} onClick={() => setSearchOpen(false)}>View all search results</Link>
          </div>}
        </form></div>
      </div>
    </header>
  );
}
