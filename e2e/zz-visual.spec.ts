import { test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";

// Opt-in visual and accessibility sweep: SHOTS_DIR=/some/dir npx playwright test e2e/zz-visual.spec.ts (runs after the other specs so there is data).
const DIR = process.env.SHOTS_DIR;
test.skip(!DIR, "set SHOTS_DIR to run the visual sweep");
test.describe.configure({ mode: "serial" });

const axePath = require.resolve("axe-core");
type Result = { page: string; viewport: string; overflow: number; offenders?: string[]; violations: { id: string; impact: string | null; nodes: number; sample: string }[] };
const results: Result[] = [];

async function sweep(p: Page, name: string, url: string) {
  for (const [vp, size] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
    await p.setViewportSize(size);
    await p.goto(url);
    await p.waitForLoadState("networkidle");
    await p.screenshot({ path: path.join(DIR!, `${name}-${vp}.png`), fullPage: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.addScriptTag({ path: axePath });
    const violations = await p.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: String(v.nodes[0]?.target?.[0] ?? "").slice(0, 120) }));
    });
    const offenders = overflow > 0 ? await p.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.body.querySelectorAll("*"))) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= window.innerWidth + 1) continue;
        let scrolled = "";
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === "auto" || ox === "scroll" || ox === "hidden") { scrolled = `[in ${a.tagName.toLowerCase()}.${String(a.className).slice(0, 40)} ${ox}] `; break; } }
        if (out.length < 12) out.push(scrolled + `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} right=${Math.round(r.right)}`);
        
      }
      return out;
    }) : undefined;
    results.push({ page: name, viewport: vp, overflow, offenders, violations });
  }
}

test("sweep", async ({ browser }) => {
  test.setTimeout(240_000);
  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Email").fill("admin@e2e.test");
  await admin.getByLabel("Password").first().fill("TestPass123!");
  await admin.getByRole("button", { name: /sign in|log in/i }).click();
  await admin.waitForURL(/\/admin\/?$/);
  for (const [name, url] of [
    ["admin-dashboard", "/admin"], ["admin-work", "/admin/work"], ["admin-project", "/admin/work/work-project"], ["admin-project-templated", "/admin/work/work-project-2"],
    ["admin-templates", "/admin/work/templates"], ["admin-timesheet", "/admin/work/timesheet"], ["admin-calendar", "/admin/work/calendar"],
    ["admin-client", "/admin/clients/work-client"], ["admin-ticket", "/admin/tickets/work-ticket"],
  ] as const) await sweep(admin, name, url);
  await admin.close();

  const client = await browser.newPage();
  await client.goto("/portal/login");
  await client.getByLabel("Email").fill("ama@work.test");
  await client.getByLabel("Password").first().fill("ClientPass123!");
  await client.getByRole("button", { name: /sign in|log in/i }).click();
  await client.waitForURL(/\/portal\/?$/);
  for (const [name, url] of [["portal-home", "/portal"], ["portal-projects", "/portal/projects"], ["portal-project", "/portal/projects/work-project"]] as const) await sweep(client, name, url);
  await client.close();
  writeFileSync(path.join(DIR!, "report.json"), JSON.stringify(results, null, 2));
});
