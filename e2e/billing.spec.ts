import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

// One long story, in order: lead -> client -> quote -> accepted -> deposit invoice -> payments -> refund -> reports.
test.describe.configure({ mode: "serial" });

let page: Page;
let quoteUrl = "";
let invoiceUrl = "";
let invoiceId = "";
let publicQuotePath = "";

const toasts = (p: Page) => p.locator("[data-sonner-toast]");

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});
test.afterAll(async () => {
  await page.close();
});

test("admin signs in", async () => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@e2e.test");
  await page.getByLabel("Password").first().fill("TestPass123!");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/admin\/?$/);
});

test("an enquiry becomes a client", async () => {
  await page.goto("/admin/messages");
  await page.getByText("Kofi Lead").first().click();
  await page.getByRole("button", { name: "Convert to client" }).click();
  await expect(page.getByRole("link", { name: "Open client" })).toBeVisible();
});

test("a quote with deposit and tax is created and sent", async () => {
  const href = await page.getByRole("link", { name: "Create quote" }).getAttribute("href");
  await page.goto(href!);
  await page.getByLabel("Title").fill("Shop website");
  await page.getByLabel("Line 1 description").fill("Design and build");
  await page.getByLabel("Line 1 unit price").fill("2000");
  await page.getByLabel("Tax %").fill("15");
  await page.getByLabel("Deposit % (optional)").fill("50");
  await page.getByRole("button", { name: "Create quote" }).click();
  await page.waitForURL(/\/admin\/billing\/quotes\/[a-z0-9]+$/);
  quoteUrl = page.url();
  await page.getByRole("button", { name: "Email to client" }).click();
  await expect(toasts(page).filter({ hasText: /link yourself|emailed/i })).toBeVisible();
  await page.reload();
  publicQuotePath = (await page.locator("a[href^='/q/']").first().getAttribute("href"))!;
  expect(publicQuotePath).toMatch(/^\/q\//);
});

test("the client sees the quote, a PDF, and accepts it", async ({ browser }) => {
  const client = await browser.newPage();
  await client.goto(publicQuotePath);
  await expect(client.locator("body")).toContainText("2,300.00"); // 2000 + 15% tax
  await expect(client.locator("body")).toContainText("Deposit: 50%");
  // In-page fetch: the API request context does not see the test.example host mapping.
  const pdf = await client.evaluate(async (u) => {
    const r = await fetch(u);
    const b = new Uint8Array(await r.arrayBuffer());
    return { ok: r.ok, type: r.headers.get("content-type"), head: String.fromCharCode(...b.slice(0, 4)) };
  }, `${publicQuotePath}/pdf`);
  expect(pdf).toEqual({ ok: true, type: "application/pdf", head: "%PDF" });
  await client.getByLabel(/Type your full name/).fill("Kofi Lead");
  await client.getByRole("button", { name: "Accept quote" }).click();
  await expect(client.getByText(/Accepted by Kofi Lead/)).toBeVisible();
  await client.close();
});

test("a deposit invoice is raised, sent, part-paid and paid", async () => {
  await page.goto(quoteUrl);
  await page.getByRole("button", { name: /deposit invoice/ }).click();
  await page.waitForURL(/\/admin\/billing\/invoices\/[a-z0-9]+$/);
  invoiceUrl = page.url();
  invoiceId = invoiceUrl.split("/").pop()!;
  await page.getByRole("button", { name: "Email to client" }).click();
  await expect(toasts(page).filter({ hasText: /link yourself|emailed/i })).toBeVisible();
  await page.reload();
  await expect(page.locator("body")).toContainText("1,150.00"); // 50% of 2000, plus 15%

  await page.locator("#p-amount").fill("400");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(toasts(page).filter({ hasText: "Part payment recorded" })).toBeVisible();
  await expect(page.locator("#p-amount")).toHaveValue("750.00"); // form re-seeds with the new balance

  await page.locator("#p-amount").fill("750");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(toasts(page).filter({ hasText: "fully paid" })).toBeVisible();
  await expect(page.locator("#record-payment")).toHaveCount(0);
});

test("a refund reopens the invoice and overpaying is refused", async () => {
  await page.reload();
  await page.getByText("Record a refund").click();
  await page.getByLabel(/Amount \(GHS\)/).first().fill("200");
  await page.getByRole("button", { name: "Record refund" }).click();
  await expect(page.locator("#record-payment")).toBeVisible();
  await page.locator("#p-amount").fill("999");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(toasts(page).filter({ hasText: /more than the balance/i })).toBeVisible();
});

test("a Paystack refund webhook is recorded once, even when repeated", async ({ request }) => {
  // Save a test key through the UI so the webhook has a secret to verify against.
  await page.goto("/admin/payments");
  await page.getByLabel("Secret key").first().fill("sk_test_e2ekey1234567890");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(toasts(page).filter({ hasText: /saved/i })).toBeVisible();

  const sign = (body: string) => createHmac("sha512", "sk_test_e2ekey1234567890").update(body).digest("hex");
  const post = async (body: string, signature = sign(body)) =>
    request.post("http://127.0.0.1:3100/api/webhooks/paystack", { data: body, headers: { "x-paystack-signature": signature, "content-type": "application/json" } });

  const charge = JSON.stringify({ event: "charge.success", data: { status: "success", reference: "e2e-gw1", amount: 20000, currency: "GHS", metadata: { invoiceId } } });
  expect((await post(charge)).status()).toBe(200);
  expect((await post(charge, "deadbeef")).status()).toBe(401);
  const refund = JSON.stringify({ event: "refund.processed", data: { transaction_reference: "e2e-gw1", refund_reference: "e2e-rf1", amount: 20000, currency: "GHS", status: "processed" } });
  expect((await post(refund)).status()).toBe(200);
  expect((await post(refund)).status()).toBe(200);

  await page.goto(invoiceUrl);
  const refunds = await page.getByText(/^Refund$|· Refund|Refund ·/).count();
  expect(refunds).toBeGreaterThanOrEqual(1);
  await page.goto("/admin/payments");
  await expect(page.locator("body")).toContainText("rejected");
  await expect(page.locator("body")).toContainText("recorded");
  await expect(page.locator("body")).toContainText("duplicate");
});

test("exports, settings and dashboard work", async () => {
  const csv = await page.evaluate(async () => (await fetch("/admin/billing/export?kind=payments")).text());
  expect(csv).toContain("Refund");
  expect(csv).toMatch(/-200/);

  await page.goto("/admin/billing/settings");
  await page.getByLabel("Tax ID (TIN / VAT number)").fill("C0012345678");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(toasts(page).filter({ hasText: "Saved" })).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(/Received this month|Outstanding/);
});

test("a payment can be recorded on a draft invoice", async () => {
  await page.goto("/admin/billing/invoices/new");
  await page.getByLabel("Client").selectOption({ label: "Kofi Lead" });
  await page.getByLabel("Title").fill("Cash job");
  await page.getByLabel("Line 1 description").fill("Repair");
  await page.getByLabel("Line 1 unit price").fill("300");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await page.waitForURL(/\/admin\/billing\/invoices\/[a-z0-9]+$/);
  await expect(page.locator("#record-payment")).toBeVisible();
  await page.locator("#p-method").selectOption("cash");
  await page.locator("#p-amount").fill("300");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(toasts(page).filter({ hasText: "fully paid" })).toBeVisible();
});

test("duplicating a sent document makes a fresh draft", async () => {
  await page.goto(quoteUrl);
  await page.getByRole("button", { name: "Duplicate as draft" }).click();
  await page.waitForURL((u) => /\/admin\/billing\/quotes\/[a-z0-9]+$/.test(u.pathname) && u.toString() !== quoteUrl);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
});

test("replacing a client link kills the old one", async ({ browser }) => {
  await page.goto(quoteUrl);
  await page.getByRole("button", { name: "Replace client link" }).click();
  await page.getByRole("button", { name: /Confirm: old link/ }).click();
  await expect(toasts(page).filter({ hasText: "New link created" })).toBeVisible();
  const anon = await browser.newPage();
  const res = await anon.goto(publicQuotePath);
  expect(res?.status()).toBe(404);
  await anon.close();
});

test("invoice reminders and recurring crons are protected", async ({ request }) => {
  for (const path of ["/api/cron/invoice-reminders", "/api/cron/recurring-invoices"]) {
    expect((await request.get(`http://127.0.0.1:3100${path}`)).status()).toBe(401);
    const ok = await request.get(`http://127.0.0.1:3100${path}`, { headers: { Authorization: "Bearer e2e-cron-secret" } });
    expect(ok.status()).toBe(200);
  }
});
