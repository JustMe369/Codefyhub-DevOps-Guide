import "server-only";
import { defaultHeaderMenuItems, headerMenuSchema } from "@/lib/site-navigation";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const getHeaderMenuItems = unstable_cache(async () => {
  const configuration = await prisma.siteConfiguration.findUnique({ where: { id: "global" }, select: { headerMenu: true } });
  const parsed = headerMenuSchema.safeParse(configuration?.headerMenu);
  return parsed.success ? parsed.data : defaultHeaderMenuItems;
}, ["site-header-menu"], { tags: ["site-navigation"], revalidate: 3600 });
