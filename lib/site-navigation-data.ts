import "server-only";
import { defaultHeaderMenuItems, headerMenuSchema } from "@/lib/site-navigation";
import { prisma } from "@/lib/prisma";

export async function getHeaderMenuItems() {
  const configuration = await prisma.siteConfiguration.findUnique({ where: { id: "global" }, select: { headerMenu: true } });
  const parsed = headerMenuSchema.safeParse(configuration?.headerMenu);
  return parsed.success ? parsed.data : defaultHeaderMenuItems;
}
