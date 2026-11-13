import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { E2E_DB } from "../playwright.config";

// Project work: task -> status -> time -> invoice from time -> dashboard.
test.describe.configure({ mode: "serial" });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3") as new (path: string) => { prepare(sql: string): { run(...args: unknown[]): unknown }; close(): void };

let page: Page;
let projectId = "";

test.beforeAll(async ({ browser }) => {
  // Seed straight into the throwaway database (the generated Prisma client is ESM-only and cannot load here).
  const db = new Database(E2E_DB);
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO "User" (id, name, email, passwordHash, role, company, updatedAt) VALUES (?, ?, ?, ?, 'CLIENT', ?, ?)`).run("work-client", "Ama Work", "ama@work.test", bcrypt.hashSync("ClientPass123!", 10), "Work Co", now);
  db.prepare(`INSERT INTO "ClientProject" (id, userId, title, status, updatedAt) VALUES (?, ?, ?, 'IN_PROGRESS', ?)`).run("work-project-2", "work-client", "Template build", now);
  projectId = "work-project";
  db.prepare(`INSERT INTO "ClientProject" (id, userId, title, status, hourlyRate, updatedAt) VALUES (?, ?, ?, 'IN_PROGRESS', 5000, ?)`).run(projectId, "work-client", "Site build", now);
  db.close();
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test("admin signs in and finds the project", async () => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@e2e.test");
  await page.getByLabel("Password").first().fill("TestPass123!");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/admin\/?$/);
  await page.goto("/admin/work");
  await expect(page.getByRole("heading", { name: "Client work" })).toBeVisible();
  await page.getByRole("link", { name: /Site build/ }).click();
  await page.waitForURL(new RegExp(`/admin/work/${projectId}$`));
});

test("a task is added, assigned to the admin, and completed", async () => {
  await page.getByText("Add a task").click();
  await page.locator("#t-title-new").fill("Design home page");
  await page.locator("#t-who-new").selectOption({ label: "E2E Admin" });
  await page.getByLabel("Show this task to the client").check();
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "Design home page" })).toBeVisible();
  await expect(page.getByText("0 of 1 tasks done")).toBeVisible();
  await page.getByLabel("Task status").selectOption("DONE");
  await expect(page.getByText("1 of 1 tasks done (100%)")).toBeVisible();
});

test("time is logged and billed to a draft invoice", async () => {
  await page.getByLabel("Time", { exact: true }).fill("1.5");
  await page.getByLabel("What was done").fill("Homepage layout");
  await page.getByRole("button", { name: "Log time" }).click();
  await expect(page.getByRole("cell", { name: "1h 30m" })).toBeVisible();
  await expect(page.getByText("1h 30m unbilled = ")).toBeVisible();
  await page.getByRole("button", { name: "Draft invoice from unbilled time" }).click();
  await page.waitForURL(/\/admin\/billing\/invoices\/[a-z0-9]+$/);
  await expect(page.locator("body")).toContainText("75.00"); // 1.5 h at 50.00
  await page.goto(`/admin/work/${projectId}`);
  await expect(page.getByText("No unbilled time")).toBeVisible();
  await expect(page.getByRole("cell").filter({ hasText: /^INV-/ })).toBeVisible();
});

test("starter templates build a project's milestones and tasks", async () => {
  await page.goto("/admin/work/templates");
  await page.getByRole("button", { name: /Add starter templates/ }).click();
  await expect(page.getByText("Website build").first()).toBeVisible();
  await page.goto("/admin/work/work-project-2");
  await page.locator("#ap-tpl").selectOption({ label: "Website build" });
  await page.getByRole("button", { name: "Add milestones and tasks" }).click();
  await expect(page.getByText("0 of 10 tasks done (0%)")).toBeVisible();
  await expect(page.getByText("Discovery").first()).toBeVisible();
  await expect(page.getByText("Waiting for client approval")).toHaveCount(0);
});

test("a milestone that needs approval is completed and waits for the client", async () => {
  await page.goto(`/admin/work/${projectId}`);
  await page.getByText("Add a milestone").click();
  await page.locator("#m-title-new").fill("Design sign-off");
  await page.getByLabel("Client must approve this stage").check();
  await page.locator("#m-bill-new").fill("500");
  await page.getByRole("button", { name: "Add milestone" }).click();
  await expect(page.getByRole("region", { name: "Milestones" }).getByText("Design sign-off")).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByText(/Waiting for client approval/)).toBeVisible();
  await expect(page.getByText(/500\.00 invoiced on approval/)).toBeVisible();
});

test("the client approves it in the portal, which drafts an invoice, and sends a request", async ({ browser }) => {
  const client = await browser.newPage();
  await client.goto("/portal/login");
  await client.getByLabel("Email").fill("ama@work.test");
  await client.getByLabel("Password").first().fill("ClientPass123!");
  await client.getByRole("button", { name: /sign in|log in/i }).click();
  await client.waitForURL(/\/portal\/?$/);
  await expect(client.getByText("ready for your approval")).toBeVisible(); // portal home flags it
  await client.goto(`/portal/projects/${projectId}`);
  await expect(client.getByText("Design home page")).toBeVisible(); // visible task
  await client.getByRole("button", { name: "Review and approve" }).click();
  await client.getByRole("button", { name: "Yes, approve" }).click();
  await expect(client.getByText(/you approved it on/)).toBeVisible();
  // A client request lands on the board.
  await client.locator("#rq-title").fill("Add a booking form");
  await client.getByRole("button", { name: "Send request" }).click();
  await expect(client.getByText("Add a booking form")).toBeVisible();
  // A message from the client.
  await client.locator("#cc-body").fill("Looks great, thank you");
  await client.getByRole("button", { name: "Send message" }).click();
  await expect(client.getByText("Looks great, thank you")).toBeVisible();
  await client.close();

  await page.goto("/admin/billing");
  await expect(page.locator("body")).toContainText("Site build: Design sign-off");
  await page.goto(`/admin/work/${projectId}`);
  await expect(page.getByText("Client request").first()).toBeVisible();
  await expect(page.getByText("Looks great, thank you")).toBeVisible();
  await expect(page.getByText(/approved by Ama Work/)).toBeVisible();
});

test("staff can message the client, keep an internal note and add a file", async () => {
  await page.locator("#pc-body").fill("Internal: client prefers WhatsApp");
  await page.getByLabel("Internal note (the client never sees it)").check();
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Internal: client prefers WhatsApp")).toBeVisible();
  await page.locator("#pf-name").fill("Mockups");
  await page.locator("#pf-url").fill("https://example.com/mockups.pdf");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("link", { name: "Mockups" })).toBeVisible();
});

test("terms, budget and profitability show on the project", async () => {
  await page.locator("#terms-budget").fill("2");
  await page.getByRole("button", { name: "Save terms" }).click();
  await expect(page.getByText(/of the hours budget used/)).toBeVisible(); // 1.5h of 2h = 75%
  await expect(page.getByText("Invoiced (before tax)")).toBeVisible();
});

test("timesheet, calendar and the personal calendar feed work", async () => {
  await page.goto("/admin/work/timesheet");
  await expect(page.getByRole("heading", { name: "Timesheet" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "E2E Admin" })).toBeVisible();
  await page.goto("/admin/work/calendar");
  await expect(page.getByRole("heading", { name: "Work calendar" })).toBeVisible();
  await page.getByRole("button", { name: "Create calendar link" }).click();
  const link = page.getByLabel("Calendar subscription link");
  await expect(link).toBeVisible();
  const url = await link.inputValue();
  const body = await page.evaluate(async (u) => { const r = await fetch(new URL(u).pathname); return { status: r.status, text: await r.text(), type: r.headers.get("content-type") }; }, url);
  expect(body.status).toBe(200);
  expect(body.type).toContain("text/calendar");
  expect(body.text).toContain("BEGIN:VCALENDAR");
  const bad = await page.evaluate(async () => (await fetch("/api/calendar/not-a-real-token-0123456789.ics")).status);
  expect(bad).toBe(404);
});

test("a ticket can be linked to a project and turned into a task", async () => {
  const db = new Database(E2E_DB);
  db.prepare(`INSERT INTO "Ticket" (id, userId, subject, body, urgent, status, updatedAt) VALUES (?, ?, ?, ?, 0, 'OPEN', ?)`).run("work-ticket", "work-client", "Logo is blurry", "The header logo looks blurry", new Date().toISOString());
  db.close();
  await page.goto("/admin/tickets/work-ticket");
  await page.locator("#tk-project").selectOption({ label: "Site build" });
  await page.getByRole("button", { name: "Save link" }).click();
  await page.getByRole("button", { name: "Create task from ticket" }).click();
  await page.goto(`/admin/work/${projectId}`);
  await expect(page.getByRole("paragraph").filter({ hasText: /Ticket T-.*Logo is blurry/ })).toBeVisible();
});

test("new cron routes are protected", async ({ request }) => {
  for (const path of ["/api/cron/task-reminders", "/api/cron/project-updates", "/api/cron/staff-digest"]) {
    expect((await request.get(`http://127.0.0.1:3100${path}`)).status()).toBe(401);
    const ok = await request.get(`http://127.0.0.1:3100${path}`, { headers: { Authorization: "Bearer e2e-cron-secret" } });
    expect(ok.status()).toBe(200);
  }
});

test("the main dashboard shows client work, requests and approvals", async () => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Client work" })).toBeVisible();
  await expect(page.getByText("Tasks overdue")).toBeVisible();
  await expect(page.getByText("Client requests to triage")).toBeVisible();
  await expect(page.getByText("Milestones waiting for client approval")).toBeVisible();
});
