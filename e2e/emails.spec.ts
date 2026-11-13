import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { daysFromNow, ts, withDb } from "./db";
import { clearMail, mailsTo, mails } from "./mail";

// The real emails the automations send, read back from the test mail server: who gets them, the subject, the links.
test.describe.configure({ mode: "serial" });

const AUTH = { Authorization: "Bearer e2e-cron-secret" };
const BASE = "http://127.0.0.1:3100";
const cron = (request: import("@playwright/test").APIRequestContext, path: string) => request.get(`${BASE}/api/cron/${path}`, { headers: AUTH });

let page: Page;

test.beforeAll(async ({ browser, request }) => {
  const now = ts();
  withDb((db) => {
    db.prepare(`INSERT INTO "User" (id, name, email, passwordHash, role, company, updatedAt) VALUES (?, 'Eli Mail', 'eli@mail.test', ?, 'CLIENT', 'Mail Co', ?)`).run("mail-client", bcrypt.hashSync("ClientPass123!", 10), now);
    db.prepare(`INSERT INTO "ClientProject" (id, userId, title, status, updatedAt) VALUES ('mail-project', 'mail-client', 'Mail project', 'IN_PROGRESS', ?)`).run(now);
    const admin = db.prepare(`SELECT id FROM "User" WHERE email = 'admin@e2e.test'`).get() as { id: string };
    // Overdue task for the admin; one finished client-visible task; one upcoming client-visible task.
    db.prepare(`INSERT INTO "Task" (id, projectId, title, status, assigneeId, dueDate, updatedAt) VALUES ('mt1', 'mail-project', 'Fix the footer', 'TODO', ?, ?, ?)`).run(admin.id, ts(daysFromNow(-3)), now);
    db.prepare(`INSERT INTO "Task" (id, projectId, title, status, clientVisible, completedAt, updatedAt) VALUES ('mt2', 'mail-project', 'Logo delivered', 'DONE', 1, ?, ?)`).run(now, now);
    db.prepare(`INSERT INTO "Task" (id, projectId, title, status, clientVisible, dueDate, updatedAt) VALUES ('mt3', 'mail-project', 'Homepage review', 'TODO', 1, ?, ?)`).run(ts(daysFromNow(5)), now);
    db.prepare(`INSERT INTO "Quote" (id, number, userId, title, status, token, sentAt, updatedAt) VALUES ('mq1', 'QUO-E2E-1', 'mail-client', 'Booking system', 'SENT', 'quote-token-e2e-0123456789', ?, ?)`).run(ts(daysFromNow(-6)), now);
    db.prepare(`INSERT INTO "QuoteItem" (id, quoteId, description, unitAmount) VALUES ('mqi1', 'mq1', 'Build', 100000)`).run();
    db.prepare(`INSERT INTO "ClientAsset" (id, userId, name, type, expiresAt) VALUES ('ma1', 'mail-client', 'mail.test', 'Domain', ?)`).run(ts(daysFromNow(5)));
    db.prepare(`INSERT INTO "ClientAsset" (id, userId, name, type, monitorUrl) VALUES ('ma2', 'mail-client', 'Dead site', 'Hosting', 'http://127.0.0.1:9/')`).run();
  });
  await clearMail(request);
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test("overdue tasks reach the assignee once", async ({ request }) => {
  const r = await cron(request, "task-reminders");
  expect(r.status()).toBe(200);
  const m = await mailsTo(request, "admin@e2e.test", /overdue task/);
  expect(m).toHaveLength(1);
  expect(m[0].subject).toBe("1 overdue task assigned to you");
  expect(m[0].text).toContain("Fix the footer");
  expect(m[0].text).toContain("/admin/work/mail-project");
  await cron(request, "task-reminders");
  expect(await mailsTo(request, "admin@e2e.test", /overdue task/)).toHaveLength(1);
});

test("the weekly progress email goes to the client with an unsubscribe link, and opting out stops it", async ({ request }) => {
  expect((await cron(request, "project-updates")).status()).toBe(200);
  const m = await mailsTo(request, "eli@mail.test", /Progress update/);
  expect(m).toHaveLength(1);
  const t = m[0].text;
  expect(t).toContain("Logo delivered");
  expect(t).toContain("Homepage review");
  expect(t).not.toContain("Fix the footer"); // staff-only task never leaks
  expect(t).toContain("/portal/projects");
  const link = t.match(/https?:\/\/\S+\/updates\?u=\S+/)?.[0];
  expect(link).toBeTruthy();

  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await page.getByRole("button", { name: "Stop progress emails" }).click();
  await expect(page.getByText(/no longer get weekly progress emails/)).toBeVisible();

  withDb((db) => db.prepare(`UPDATE "ClientProject" SET lastClientUpdateAt = NULL WHERE id = 'mail-project'`).run());
  await cron(request, "project-updates");
  expect(await mailsTo(request, "eli@mail.test", /Progress update/)).toHaveLength(1); // still just the first one

  await page.goto("/updates?u=mail-client&t=forged");
  await expect(page.getByText("This link is not valid")).toBeVisible();
});

test("a quote that gets no answer is followed up once", async ({ request }) => {
  await cron(request, "quote-followups");
  const m = await mailsTo(request, "eli@mail.test", /Following up on quote/);
  expect(m).toHaveLength(1);
  expect(m[0].subject).toBe("Following up on quote QUO-E2E-1");
  expect(m[0].text).toContain("/q/quote-token-e2e-0123456789");
  await cron(request, "quote-followups");
  expect(await mailsTo(request, "eli@mail.test", /Following up on quote/)).toHaveLength(1);
});

test("an item about to expire gets a renewal notice, and you get a summary", async ({ request }) => {
  await cron(request, "asset-renewals");
  const m = await mailsTo(request, "eli@mail.test", /renewal/);
  expect(m).toHaveLength(1);
  expect(m[0].subject).toBe("Domain renewal: mail.test expires within 7 days");
  expect(m[0].text).toContain("/portal/assets");
  const s = await mailsTo(request, "owner@e2e.test", /Renewals:/);
  expect(s).toHaveLength(1);
  expect(s[0].text).toContain("Mail Co: mail.test");
  await cron(request, "asset-renewals");
  expect(await mailsTo(request, "eli@mail.test", /renewal/)).toHaveLength(1);
});

test("a monitored site that is down alerts you once", async ({ request }) => {
  test.setTimeout(90_000);
  await cron(request, "uptime");
  const m = await mailsTo(request, "owner@e2e.test", /^DOWN:/);
  expect(m).toHaveLength(1);
  expect(m[0].subject).toBe("DOWN: Mail Co: Dead site");
  expect(m[0].text).toContain("http://127.0.0.1:9/");
  await cron(request, "uptime");
  expect(await mailsTo(request, "owner@e2e.test", /^DOWN:/)).toHaveLength(1);
});

test("the Monday staff digest lists the week", async ({ request }) => {
  await cron(request, "staff-digest");
  const m = await mailsTo(request, "admin@e2e.test", /^Your week:/);
  expect(m).toHaveLength(1);
  expect(m[0].text).toContain("Fix the footer");
});

test("accepting a quote creates the project and tells you where to start", async ({ browser, request }) => {
  await clearMail(request);
  const client = await browser.newPage();
  await client.goto("/q/quote-token-e2e-0123456789");
  await client.getByLabel(/Type your full name/).fill("Eli Mail");
  await client.getByRole("button", { name: "Accept quote" }).click();
  await expect(client.getByText(/Accepted by Eli Mail/)).toBeVisible();
  await client.close();
  const row = withDb((db) => db.prepare(`SELECT p.id, p.title, p.status, q.projectId FROM "Quote" q JOIN "ClientProject" p ON p.id = q.projectId WHERE q.id = 'mq1'`).get()) as { id: string; title: string; status: string };
  expect(row.title).toBe("Booking system");
  expect(row.status).toBe("PLANNING");
  const m = await mailsTo(request, "owner@e2e.test", /accepted/);
  expect(m).toHaveLength(1);
  expect(m[0].text).toContain(`/admin/work/${row.id}`);
});

test("approval, message and request emails go to the right people", async ({ browser, request }) => {
  await clearMail(request);
  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Email").fill("admin@e2e.test");
  await admin.getByLabel("Password").first().fill("TestPass123!");
  await admin.getByRole("button", { name: /sign in|log in/i }).click();
  await admin.waitForURL(/\/admin\/?$/);
  await admin.goto("/admin/work/mail-project");

  // Milestone needing approval: completing it emails the client.
  await admin.getByText("Add a milestone").click();
  await admin.locator("#m-title-new").fill("Go-live sign-off");
  await admin.getByLabel("Client must approve this stage").check();
  await admin.getByRole("button", { name: "Add milestone" }).click();
  await expect(admin.getByRole("region", { name: "Milestones" }).getByText("Go-live sign-off")).toBeVisible();
  await admin.getByRole("button", { name: "Mark complete" }).click();
  await expect(admin.getByText(/Waiting for client approval/)).toBeVisible();
  const review = await mailsTo(request, "eli@mail.test", /Please review: Go-live sign-off/);
  expect(review).toHaveLength(1);
  expect(review[0].text).toContain("/portal/projects/mail-project");

  // Staff message is emailed; an internal note is not.
  await admin.locator("#pc-body").fill("We have uploaded the draft");
  await admin.getByRole("button", { name: "Send to client" }).click();
  await expect(admin.locator("[data-sonner-toast]").filter({ hasText: /Message posted/ })).toBeVisible();
  await expect(admin.getByRole("listitem").filter({ hasText: "We have uploaded the draft" })).toBeVisible();
  await admin.locator("#pc-body").fill("Private: chase payment");
  await admin.getByLabel("Internal note (the client never sees it)").check();
  await admin.getByRole("button", { name: "Save note" }).click();
  await expect(admin.getByRole("listitem").filter({ hasText: "Private: chase payment" })).toBeVisible();
  expect(await mailsTo(request, "eli@mail.test", /New message on Mail project/)).toHaveLength(1);
  expect((await mails(request)).some((m) => m.text.includes("Private: chase payment"))).toBe(false);

  // The client approves, asks for work and writes back: you are told each time.
  const client = await browser.newPage();
  await client.goto("/portal/login");
  await client.getByLabel("Email").fill("eli@mail.test");
  await client.getByLabel("Password").first().fill("ClientPass123!");
  await client.getByRole("button", { name: /sign in|log in/i }).click();
  await client.waitForURL(/\/portal\/?$/);
  await client.goto("/portal/projects/mail-project");
  await client.getByRole("button", { name: "Review and approve" }).click();
  await client.getByRole("button", { name: "Yes, approve" }).click();
  await expect(client.getByText(/you approved it on/)).toBeVisible();
  await client.locator("#rq-title").fill("Add live chat");
  await client.getByRole("button", { name: "Send request" }).click();
  await expect(client.locator("[data-sonner-toast]").filter({ hasText: /Request sent/ })).toBeVisible();
  await client.locator("#cc-body").fill("Thanks, looks good");
  await client.getByRole("button", { name: "Send message" }).click();
  await expect(client.getByRole("listitem").filter({ hasText: "Thanks, looks good" })).toBeVisible();
  expect(await mailsTo(request, "owner@e2e.test", /Milestone approved: Go-live sign-off/)).toHaveLength(1);
  const req = await mailsTo(request, "owner@e2e.test", /New request on Mail project: Add live chat/);
  expect(req).toHaveLength(1);
  expect(req[0].text).toContain("/admin/work/mail-project");
  expect(await mailsTo(request, "owner@e2e.test", /wrote on Mail project/)).toHaveLength(1);
  await client.close();
  await admin.close();
});

test("editing a client item restarts its renewal notices and uptime tracking", async ({ browser, request }) => {
  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Email").fill("admin@e2e.test");
  await admin.getByLabel("Password").first().fill("TestPass123!");
  await admin.getByRole("button", { name: /sign in|log in/i }).click();
  await admin.waitForURL(/\/admin\/?$/);
  const before = withDb((db) => ({ a: db.prepare(`SELECT renewalStage FROM "ClientAsset" WHERE id = 'ma1'`).get(), b: db.prepare(`SELECT monitorDownSince FROM "ClientAsset" WHERE id = 'ma2'`).get() })) as { a: { renewalStage: number }; b: { monitorDownSince: string | null } };
  expect(before.a.renewalStage).toBe(2);
  expect(before.b.monitorDownSince).toBeTruthy();

  await admin.goto("/admin/clients/mail-client");
  await admin.locator("li", { hasText: "mail.test" }).getByText("Edit", { exact: true }).click();
  await admin.locator("#ea-exp-ma1").fill(daysFromNow(60).toISOString().slice(0, 10));
  await admin.getByRole("button", { name: "Save item" }).click();
  await expect(admin.getByText("Saved.")).toBeVisible();
  await admin.reload();
  await admin.locator("li", { hasText: "Dead site" }).getByText("Edit", { exact: true }).click();
  await admin.locator("#ea-monitor-ma2").fill("https://example.org");
  await admin.getByRole("button", { name: "Save item" }).click();
  await expect(admin.getByText("Saved.")).toBeVisible();
  await admin.close();

  const after = withDb((db) => ({ a: db.prepare(`SELECT renewalStage FROM "ClientAsset" WHERE id = 'ma1'`).get(), b: db.prepare(`SELECT monitorDownSince, monitorUrl FROM "ClientAsset" WHERE id = 'ma2'`).get() })) as { a: { renewalStage: number }; b: { monitorDownSince: string | null; monitorUrl: string } };
  expect(after.a.renewalStage).toBe(0);
  expect(after.b.monitorDownSince).toBeNull();
  expect(after.b.monitorUrl).toBe("https://example.org/");
  await clearMail(request);
  await cron(request, "asset-renewals"); // 60 days away: nothing due
  expect(await mailsTo(request, "eli@mail.test", /renewal/)).toHaveLength(0);
});
