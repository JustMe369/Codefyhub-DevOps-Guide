import { GuideNav } from "@/components/guide-nav";

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <div className="shell guide-grid"><GuideNav />{children}</div>;
}
