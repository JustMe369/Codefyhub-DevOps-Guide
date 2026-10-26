"use client";

import Link from "next/link";
import { Menu, Moon, Search, Sun, TerminalSquare, X } from "lucide-react";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("devops-guide:theme");
    if (saved === "light") document.documentElement.dataset.theme = "light";
  }, []);
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setTheme(next); localStorage.setItem("devops-guide:theme", next); document.documentElement.dataset.theme = next;
  }
  function closeMenu() { setMenuOpen(false); }
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark"><TerminalSquare size={17} aria-hidden="true" /></span>
          <span>Codefyhub-DevOps Guide<small>Infrastructure operations</small></span>
        </Link>
        <button className="header-icon menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        <nav className={`main-nav${menuOpen ? " open" : ""}`} aria-label="Primary navigation">
          <Link onClick={closeMenu} href="/guides/start-here">Guides</Link>
          <Link onClick={closeMenu} href="/exam">Exam</Link>
          <Link onClick={closeMenu} href="/glossary">Glossary</Link>
          <Link onClick={closeMenu} href="/checklist">Readiness</Link>
        </nav>
        <button className="header-icon theme-toggle" type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <form className="search-form" action="/search" role="search">
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="global-search">Search the guide</label>
          <input id="global-search" className="search-input" name="q" type="search" placeholder="Search the field guide…" />
        </form>
      </div>
    </header>
  );
}
