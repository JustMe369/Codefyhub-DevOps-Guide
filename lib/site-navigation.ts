import { z } from "zod";

const navigationHref = z.string().trim().min(1).max(500).refine(
  (value) => (/^\/(?!\/)/.test(value) && !/[\r\n]/.test(value)) || /^https:\/\/[^\s]+$/i.test(value),
  "Use a site path beginning with / or a secure https:// URL.",
);

export const headerMenuItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(40),
  href: navigationHref,
  visible: z.boolean(),
  featured: z.boolean(),
  newTab: z.boolean(),
});

export const headerMenuSchema = z.array(headerMenuItemSchema).max(12).superRefine((items, context) => {
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (ids.has(item.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "Navigation item IDs must be unique." });
    ids.add(item.id);
  }
});

export type HeaderMenuItem = z.infer<typeof headerMenuItemSchema>;

export const defaultHeaderMenuItems: HeaderMenuItem[] = [
  { id: "guides", label: "Guides", href: "/guides/start-here", visible: true, featured: false, newTab: false },
  { id: "configs", label: "Configs", href: "/configurations", visible: true, featured: false, newTab: false },
  { id: "exam", label: "Exam", href: "/exam", visible: true, featured: false, newTab: false },
  { id: "glossary", label: "Glossary", href: "/glossary", visible: true, featured: false, newTab: false },
  { id: "readiness", label: "Readiness", href: "/checklist", visible: true, featured: false, newTab: false },
  { id: "portal", label: "Company Portal", href: "/portal", visible: true, featured: true, newTab: false },
];

