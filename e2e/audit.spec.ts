import { expect, test, request as createRequest, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { permissionKeys } from "../lib/admin/permissions";

// This suite creates and removes fixtures. CI runs it against its disposable DB.
test("audit boundaries hold across real HTTP requests and concurrent transactions", async ({ baseURL, page }, testInfo) => {
  test.skip(process.env.AUDIT_E2E !== "1" || testInfo.project.name !== "chromium", "Enable only against a disposable migrated database.");
  test.setTimeout(120_000);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const run = randomUUID();
  const companyId = `audit-${run}`;
  const contexts: APIRequestContext[] = [];
  const userIds: string[] = [];
  const password = `test-only-${randomUUID()}`;
  const requestFor = async (id: string, platform = false) => {
    const email = `${id}@audit.invalid`;
    await prisma.user.create({ data: { id, name: id, email, role: platform ? "admin" : "user", accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } } } });
    userIds.push(id);
    const context = await createRequest.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
    contexts.push(context);
    expect((await context.post("/api/auth/sign-in/email", { data: { email, password } })).status()).toBe(200);
    await context.storageState().then(async (state) => {
      state.cookies.push({ name: "codefyhub_active_company", value: companyId, domain: new URL(baseURL!).hostname, path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" });
      await context.dispose();
      contexts.pop();
      const selected = await createRequest.newContext({ baseURL, storageState: state, extraHTTPHeaders: { Origin: baseURL! } });
      contexts.push(selected);
    });
    return contexts.at(-1)!;
  };

  try {
    await prisma.company.create({ data: { id: companyId, name: companyId, slug: companyId, isPublic: true } });
    const ownerRole = await prisma.companyRole.create({ data: { companyId, name: "Owner", slug: "company-owner", description: "Audit fixture owner", permissions: { create: permissionKeys.map((permissionId) => ({ permissionId })) } } });
    const viewerRole = await prisma.companyRole.create({ data: { companyId, name: "Viewer", slug: "viewer", description: "Audit fixture reader", permissions: { create: [{ permissionId: "content.view" }] } } });
    const admin = await requestFor(`admin-${run}`, true);
    const viewerId = `viewer-${run}`;
    const viewer = await requestFor(viewerId);
    await prisma.membership.create({ data: { companyId, userId: viewerId, roleId: viewerRole.id } });
    const section = await prisma.section.create({ data: { companyId, slug: "storage-raid", title: "Audit collision section", summary: "Isolated audit fixture", icon: "BookOpen", order: 1 } });
    const source = await prisma.source.create({ data: { companyId, title: "Audit evidence", organization: "Audit", url: "https://example.com/audit", sourceType: "official", lastVerifiedAt: new Date() } });
    const makeArticle = (slug: string, order: number, status: "DRAFT" | "PUBLISHED", visibility: "PUBLIC" | "INTERNAL" | "DRAFT" | "RESTRICTED" = "INTERNAL") => prisma.article.create({ data: {
      companyId, sectionId: section.id, slug, order, title: `Audit ${slug} ${run}`, description: "Isolated fixture for the project audit regression tests.", body: "## Question\n\nHow do we verify access?\n\n## Answer\n\nUse isolated fixtures and verify each permission boundary through real HTTP requests.", contentType: "FAQ", readingMinutes: 2,
      status, visibility, validationStatus: "SOURCE_REVIEWED", reviewStatus: status === "PUBLISHED" ? "APPROVED" : "DRAFT", lastVerifiedAt: new Date(), versions: { create: { revision: 1, body: "Historical confidential draft", changeSummary: "Audit fixture" } }, articleSources: { create: { sourceId: source.id, claimScope: "Supports the audit fixture answer." } },
    } });
    const published = await makeArticle("mdadm-zfs", 1, "PUBLISHED", "PUBLIC");
    const draft = await makeArticle("draft", 2, "DRAFT");
    const hidden = await makeArticle("hidden", 3, "PUBLISHED", "DRAFT");
    const restricted = await makeArticle("restricted", 4, "PUBLISHED", "RESTRICTED");
    const expired = await makeArticle("expired", 5, "PUBLISHED");
    await prisma.article.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } });
    const list = await viewer.get("/api/admin/articles");
    expect(list.status()).toBe(200);
    expect((await list.json()).items.map((item: { id: string }) => item.id)).toEqual([published.id]);
    for (const article of [draft, hidden, restricted, expired]) {
      expect((await viewer.get(`/api/admin/articles/${article.id}`)).status()).toBe(404);
    }
    expect((await viewer.get("/api/admin/articles?status=DRAFT")).status()).toBe(200);
    expect((await (await viewer.get("/api/admin/articles?status=DRAFT")).json()).items).toEqual([]);
    const detail = await (await viewer.get(`/api/admin/articles/${published.id}`)).json();
    expect(detail.article).not.toHaveProperty("versions");
    expect(JSON.stringify(detail)).not.toContain("Historical confidential draft");
    await page.context().addCookies((await viewer.storageState()).cookies);
    await page.goto(`/admin/articles/${published.id}`);
    await expect(page).toHaveURL(/\/portal(?:\/knowledge\/[^/]+)?$/);
    await page.goto(`/portal/knowledge/${published.id}`);
    await expect(page.getByRole("heading", { name: published.title })).toBeVisible();

    expect((await admin.put(`/api/admin/articles/${published.id}/sources`, { data: { sourceIds: [], expectedUpdatedAt: published.updatedAt } })).status()).toBe(409);
    expect((await admin.delete(`/api/admin/sources/${source.id}`)).status()).toBe(409);
    expect((await admin.put(`/api/admin/articles/${draft.id}/sources`, { data: { sourceIds: [], expectedUpdatedAt: draft.updatedAt } })).status()).toBe(200);
    expect((await admin.put(`/api/admin/articles/${draft.id}/sources`, { data: { sourceIds: [source.id], expectedUpdatedAt: draft.updatedAt } })).status()).toBe(409);

    const ready = await makeArticle("publish-race", 6, "DRAFT");
    const approved = await prisma.article.update({ where: { id: ready.id }, data: { reviewStatus: "APPROVED" } });
    const race = await Promise.all([
      admin.post(`/api/admin/articles/${ready.id}/publish`, { data: { expectedUpdatedAt: approved.updatedAt } }),
      admin.patch(`/api/admin/articles/${ready.id}`, { data: { expectedUpdatedAt: approved.updatedAt, changeSummary: "Concurrent revision", data: { title: "Concurrent unreviewed title" } } }),
    ]);
    expect(race.map((response) => response.status()).sort()).toEqual([200, 409]);
    const final = await prisma.article.findUniqueOrThrow({ where: { id: ready.id } });
    expect(final.status !== "PUBLISHED" || final.reviewStatus === "APPROVED").toBe(true);

    const owners = [];
    for (let index = 0; index < 2; index++) {
      const id = `owner-${index}-${run}`;
      await prisma.user.create({ data: { id, name: id, email: `${id}@audit.invalid` } }); userIds.push(id);
      owners.push(await prisma.membership.create({ data: { companyId, userId: id, roleId: ownerRole.id } }));
    }
    const removals = await Promise.all(owners.map((owner) => admin.delete(`/api/admin/members/${owner.id}`)));
    expect(removals.map((response) => response.status()).sort()).toEqual([200, 409]);
    expect(await prisma.membership.count({ where: { companyId, roleId: ownerRole.id, status: "ACTIVE" } })).toBe(1);

    const publicPage = await admin.get("/guides/storage-raid/mdadm-zfs");
    expect(await publicPage.text()).not.toContain(published.title);
    const search = await admin.get(`/api/search?q=${encodeURIComponent(run)}`);
    expect(await search.text()).not.toContain(published.id);
    expect(await (await admin.get("/sitemap.xml")).text()).not.toContain("/guides/storage-raid/publish-race");

    const tag = await prisma.tag.create({ data: { companyId, slug: "audit-tag", name: "uniquetagbefore" } });
    await prisma.articleTag.create({ data: { articleId: published.id, tagId: tag.id } });
    const matches = () => prisma.$queryRaw<Array<{ matched: boolean }>>`SELECT "searchDocument" @@ plainto_tsquery('simple', 'uniquetagafter') AS matched FROM "Article" WHERE id = ${published.id}`;
    expect((await matches())[0].matched).toBe(false);
    await prisma.tag.update({ where: { id: tag.id }, data: { name: "uniquetagafter" } });
    expect((await matches())[0].matched).toBe(true);
    await prisma.articleTag.delete({ where: { articleId_tagId: { articleId: published.id, tagId: tag.id } } });
    expect((await matches())[0].matched).toBe(false);
  } finally {
    await Promise.all(contexts.map((context) => context.dispose()));
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});
