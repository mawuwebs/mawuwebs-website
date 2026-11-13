import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardArea } from "@/lib/guard-area";
import { parseTemplate, templateCounts } from "@/lib/work";
import { StarterTemplatesButton, TemplateEditor } from "@/components/admin/work-forms";

export const metadata: Metadata = { title: "Project templates" };

export default async function TemplatesPage() {
  await guardArea("orders");
  const templates = await prisma.projectTemplate.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/admin/work" className="text-sm text-muted-foreground hover:text-foreground">← Client work</Link>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Project templates</h1>
        <p className="text-muted-foreground">Reusable milestones and tasks. Apply one from a project&apos;s page and the due dates count from the start date you pick.</p>
      </div>
      {templates.length === 0 && <StarterTemplatesButton />}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">New template</h2>
        <div className="rounded-2xl border border-border bg-card p-5"><TemplateEditor templateId={null} initial={{ name: "", description: "", body: "" }} /></div>
      </section>
      {templates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your templates</h2>
          {templates.map((t) => {
            const c = templateCounts(parseTemplate(t.body));
            return (
              <details key={t.id} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer text-sm"><span className="font-medium">{t.name}</span> <span className="text-muted-foreground">· {c.milestones} milestones, {c.tasks} tasks{t.description ? ` · ${t.description}` : ""}</span></summary>
                <div className="mt-4"><TemplateEditor templateId={t.id} initial={{ name: t.name, description: t.description, body: t.body }} /></div>
              </details>
            );
          })}
          <StarterTemplatesButton />
        </section>
      )}
    </div>
  );
}
