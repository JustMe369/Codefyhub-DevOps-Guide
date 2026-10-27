import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <span>Codefyhub-DevOps Guide · Professional knowledge system</span>
        <span>Verify commands in a lab before production use.</span>
        <Link href="/admin/sign-in">Administrator sign in</Link>
      </div>
    </footer>
  );
}
