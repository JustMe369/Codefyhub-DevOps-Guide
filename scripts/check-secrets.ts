import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const findings: string[] = [];
const patterns: Array<[string, RegExp]> = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["OpenRouter key", /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/],
  ["Groq key", /\bgsk_[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ["Vercel OIDC/JWT", /\beyJ[A-Za-z0-9_-]{80,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ["credential-bearing PostgreSQL URL", /postgres(?:ql)?:\/\/[^:\s]+:[^@\s<>]+@[^\s]+/i]
];

for (const file of files) {
  if (/\.(?:jpg|jpeg|png|gif|ico|woff2?|zip|pdf)$/i.test(file)) continue;
  let content: string;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  if (file === ".env.example") content = content.replace(/postgres(?:ql)?:\/\/[^\r\n]+/gi, "");
  if (file.startsWith(".github/workflows/")) {
    content = content
      .replace(/postgresql:\/\/placeholder:placeholder@localhost:5432\/placeholder/g, "")
      .replace(/postgresql:\/\/postgres:postgres@localhost:5432\/postgres/g, "")
      .replace(/postgresql:\/\/devops_guide:test_password_only@127\.0\.0\.1:5432\/devops_guide\?schema=public/g, "");
  }
  for (const [name, pattern] of patterns) if (pattern.test(content)) findings.push(`${file}: possible ${name}`);
}

if (findings.length) { findings.forEach((finding) => console.error(`ERROR ${finding}`)); process.exitCode = 1; }
else console.log(`Secret scan passed for ${files.length} tracked and unignored files.`);
