"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickySaveBar } from "@/components/admin/sticky-save-bar";
import { RowsEditor, type Col } from "@/components/admin/rows-editor";
import { saveFormConfig, resetFormConfig, type FormConfigState } from "@/lib/actions/form-config";
import { toSlug } from "@/lib/slug";
import type { EstimateConfig, Option, Tier } from "@/lib/estimate";
import type { SupportConfig } from "@/lib/support";
import type { Question } from "@/lib/health-check";

const initial: FormConfigState = { success: false, message: "" };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function SaveBar({ configKey, pending, state, customised }: { configKey: "support" | "estimate" | "healthcheck"; pending: boolean; state: FormConfigState; customised: boolean }) {
  const router = useRouter();
  React.useEffect(() => {
    if (state.message && state.success) toast.success(state.message);
  }, [state]);
  const [resetting, startReset] = React.useTransition();
  return (
    <StickySaveBar message={state.message} success={state.success}>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save changes
      </Button>
      {customised && (
        <Button
          type="button"
          variant="ghost"
          disabled={resetting}
          onClick={() => {
            if (!confirm("Reset these options to the built-in defaults? Your edits will be lost.")) return;
            startReset(async () => {
              const r = await resetFormConfig(configKey);
              if (r.success) {
                toast.success(r.message);
                router.refresh();
                window.location.reload();
              } else toast.error(r.message);
            });
          }}
        >
          <RotateCcw className="size-4" />
          Reset to defaults
        </Button>
      )}
    </StickySaveBar>
  );
}

// ---------------- Support ----------------

export function SupportConfigEditor({ initialConfig, customised }: { initialConfig: SupportConfig; customised: boolean }) {
  const [issues, setIssues] = React.useState(initialConfig.issues.map((label) => ({ label })));
  const [urgency, setUrgency] = React.useState(initialConfig.urgency);
  const [state, action, pending] = useActionState(saveFormConfig.bind(null, "support"), initial);
  const json = JSON.stringify({ issues: issues.map((i) => i.label), urgency });

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="json" value={json} />
      <Section title="What is the problem about?" hint="The pill choices on the first question of the support form.">
        <RowsEditor rows={issues} onChange={setIssues} blank={() => ({ label: "" })} cols={[{ key: "label", label: "Option", type: "text" }]} addLabel="Add an issue type" minRows={2} />
      </Section>
      <Section title="How urgent is it?" hint='Switch on "Work-stopping" for the level that should be flagged as urgent: it shows a red badge in Orders, jumps the queue on the dashboard and tags the notification email.'>
        <RowsEditor
          rows={urgency}
          onChange={setUrgency}
          blank={() => ({ label: "", urgent: false })}
          cols={[
            { key: "label", label: "Option", type: "text" },
            { key: "urgent", label: "Work-stopping", type: "check", className: "flex-none min-w-0" },
          ]}
          addLabel="Add an urgency level"
          minRows={2}
        />
      </Section>
      <SaveBar configKey="support" pending={pending} state={state} customised={customised} />
    </form>
  );
}

// ---------------- Estimate ----------------

const optionCols: Col<Option>[] = [
  { key: "label", label: "Label", type: "text" },
  { key: "hint", label: "Hint (optional)", type: "text" },
  { key: "points", label: "Points", type: "number", className: "flex-none w-24 min-w-0" },
];

/** New options get a stable internal id from their label; clashes get a numeric suffix. */
function withIds(list: Option[]): Option[] {
  const used = new Set(list.filter((o) => o.id).map((o) => o.id));
  return list.map((o) => {
    if (o.id) return o;
    const base = toSlug(o.label).slice(0, 30) || "option";
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { ...o, id };
  });
}

/** Last tier is open-ended; every other tier needs a number. */
function normaliseTiers(tiers: Tier[]): Tier[] {
  return tiers.map((t, i) => {
    const last = i === tiers.length - 1;
    if (last) return { ...t, max: null };
    return { ...t, max: t.max === null ? (tiers[i - 1]?.max ?? 0) + 5 : t.max };
  });
}

export function EstimateConfigEditor({ initialConfig, customised }: { initialConfig: EstimateConfig; customised: boolean }) {
  const [types, setTypes] = React.useState<Option[]>(initialConfig.types);
  const [sizes, setSizes] = React.useState<Option[]>(initialConfig.sizes);
  const [features, setFeatures] = React.useState<Option[]>(initialConfig.features);
  const [timelines, setTimelines] = React.useState<Option[]>(initialConfig.timelines);
  const [tiers, setTiers] = React.useState<Tier[]>(initialConfig.tiers);
  const [itTier, setItTier] = React.useState(initialConfig.itTier);
  const [state, action, pending] = useActionState(saveFormConfig.bind(null, "estimate"), initial);

  const blankOpt = (): Option => ({ id: "", label: "", hint: "", points: 0 });
  const json = JSON.stringify({
    types: withIds(types).map(clean),
    sizes: withIds(sizes).map(clean),
    features: withIds(features).map(clean),
    timelines: withIds(timelines).map(clean),
    tiers: normaliseTiers(tiers),
    itTier,
  });

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="json" value={json} />
      <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
        Visitors never see points or prices. Points are added up (project type + size + features) and the total picks the tier shown on the result screen.
      </p>

      <Section title="Project types" hint='The type with internal id "it" skips the size and feature questions and shows the IT assessment result instead.'>
        <RowsEditor rows={types} onChange={setTypes} blank={blankOpt} cols={optionCols} addLabel="Add a project type" minRows={2} readOnlyId="id" />
      </Section>
      <Section title="Sizes" hint="Asked for websites, stores and apps.">
        <RowsEditor rows={sizes} onChange={setSizes} blank={blankOpt} cols={optionCols} addLabel="Add a size" minRows={1} readOnlyId="id" />
      </Section>
      <Section title="Features" hint="Visitors can tick several.">
        <RowsEditor rows={features} onChange={setFeatures} blank={blankOpt} cols={optionCols} addLabel="Add a feature" readOnlyId="id" />
      </Section>
      <Section title="Timelines">
        <RowsEditor rows={timelines} onChange={setTimelines} blank={blankOpt} cols={optionCols} addLabel="Add a timeline" minRows={1} readOnlyId="id" />
      </Section>

      <Section title="Result tiers" hint="The first tier whose limit is at or above the visitor's total points is shown. The last tier has no limit.">
        <RowsEditor
          rows={tiers}
          onChange={(rows) => setTiers(normaliseTiers(rows))}
          blank={() => ({ max: 0, name: "", weeks: "", summary: "" })}
          addLabel="Add a tier"
          minRows={1}
          cols={[
            { key: "name", label: "Name", type: "text" },
            { key: "weeks", label: "Typical build time", type: "text" },
            { key: "max", label: "Up to points", type: "number", className: "flex-none w-28 min-w-0", placeholder: "No limit", disabled: (_r, i, rows) => i === rows.length - 1 },
            { key: "summary", label: "Summary shown to the visitor", type: "area", className: "basis-full" },
          ]}
        />
      </Section>

      <Section title="IT assessment result" hint="Shown for the IT project type instead of a tier.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="it-name" className="mb-1 block text-xs text-muted-foreground">Name</label>
            <Input id="it-name" value={itTier.name} onChange={(e) => setItTier({ ...itTier, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="it-weeks" className="mb-1 block text-xs text-muted-foreground">Timing line</label>
            <Input id="it-weeks" value={itTier.weeks} onChange={(e) => setItTier({ ...itTier, weeks: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="it-summary" className="mb-1 block text-xs text-muted-foreground">Summary</label>
            <Textarea id="it-summary" rows={3} value={itTier.summary} onChange={(e) => setItTier({ ...itTier, summary: e.target.value })} />
          </div>
        </div>
      </Section>

      <SaveBar configKey="estimate" pending={pending} state={state} customised={customised} />
    </form>
  );
}

function clean(o: Option): Option {
  return { id: o.id, label: o.label, hint: o.hint || undefined, points: Number(o.points) || 0 };
}

// ---------------- IT health check ----------------

export function HealthCheckConfigEditor({ initialConfig, customised }: { initialConfig: Question[]; customised: boolean }) {
  const [questions, setQuestions] = React.useState<Question[]>(initialConfig);
  const [state, action, pending] = useActionState(saveFormConfig.bind(null, "healthcheck"), initial);

  const used = new Set<string>();
  const withQuestionIds = questions.map((q) => {
    if (q.id && !used.has(q.id)) {
      used.add(q.id);
      return q;
    }
    const base = toSlug(q.text).slice(0, 30) || "question";
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { ...q, id };
  });
  const json = JSON.stringify({
    questions: withQuestionIds.map((q) => ({ ...q, hint: q.hint || undefined })),
  });

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="json" value={json} />
      <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
        Each question is answered Yes, Partly or No (2, 1 or 0 points). The score is the total as a percentage. Questions in the same area are
        grouped in the result. Past leads keep the wording they answered, so edits never change old results.
      </p>
      <Section
        title="Questions"
        hint="Order here is the order visitors see. “If not Yes” is the gap shown in the result. Service is the slug of the service that fixes it, e.g. cybersecurity."
      >
        <RowsEditor
          rows={questions}
          onChange={setQuestions}
          blank={() => ({ id: "", area: questions[questions.length - 1]?.area ?? "", text: "", hint: "", gap: "", service: "" })}
          addLabel="Add a question"
          minRows={4}
          readOnlyId="id"
          cols={[
            { key: "area", label: "Area", type: "text", className: "flex-none basis-56" },
            { key: "text", label: "Question", type: "text", className: "basis-full" },
            { key: "hint", label: "Hint (optional)", type: "text", className: "basis-full" },
            { key: "gap", label: "If not Yes, the gap is…", type: "area", className: "basis-full" },
            { key: "service", label: "Service slug", type: "text", className: "flex-none basis-56" },
          ]}
        />
      </Section>
      <SaveBar configKey="healthcheck" pending={pending} state={state} customised={customised} />
    </form>
  );
}
