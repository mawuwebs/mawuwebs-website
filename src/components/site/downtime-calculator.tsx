"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function Field({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5" />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function DowntimeCalculator() {
  const [staff, setStaff] = useState("10");
  const [hourly, setHourly] = useState("");
  const [lost, setLost] = useState("2");
  const [daily, setDaily] = useState("");
  const [incidents, setIncidents] = useState("1");
  const [outageDays, setOutageDays] = useState("1");

  const slow = num(staff) * num(hourly) * num(lost) * 12;
  const outage = num(daily) * num(outageDays) * num(incidents);
  const total = slow + outage;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <h2 className="font-display text-xl font-semibold">Everyday IT friction</h2>
        <Field id="staff" label="People who use computers" hint="Everyone on the team" value={staff} onChange={setStaff} />
        <Field id="hourly" label="Average cost of one staff hour" hint="Salary plus overheads, in your currency" value={hourly} onChange={setHourly} />
        <Field id="lost" label="Hours lost per person per month" hint="Slow machines, logins, printers, waiting for help" value={lost} onChange={setLost} />
        <h2 className="pt-4 font-display text-xl font-semibold">Serious outages</h2>
        <Field id="daily" label="Revenue or output lost per day of downtime" hint="What a day without systems or data costs you" value={daily} onChange={setDaily} />
        <Field id="outageDays" label="Days lost per serious outage" hint="Be honest: restoring from scratch often takes days" value={outageDays} onChange={setOutageDays} />
        <Field id="incidents" label="Serious outages per year" hint="Ransomware, failed drive, long internet or power failure" value={incidents} onChange={setIncidents} />
      </div>
      <div className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24" aria-live="polite">
        <p className="text-sm text-muted-foreground">Estimated yearly cost of IT problems</p>
        <p className="mt-1 font-display text-5xl font-bold">{total > 0 ? fmt(total) : "-"}</p>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Everyday friction</dt><dd>{fmt(slow)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Serious outages</dt><dd>{fmt(outage)}</dd></div>
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          This uses only the numbers you entered. It leaves out recovery costs, lost customers and any fines, so the real figure is usually higher.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/plans" className={buttonVariants()}>See managed plans</Link>
          <Link href="/book-a-call" className={buttonVariants({ variant: "outline" })}>Talk to us</Link>
        </div>
      </div>
    </div>
  );
}
