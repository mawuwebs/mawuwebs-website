import "server-only";
import { prisma } from "@/lib/prisma";

export type EntityType = "post" | "page" | "project" | "service" | "plan";

type Row = Record<string, unknown>;
type Delegate = {
  findUnique(a: { where: { id: string }; include?: object }): Promise<Row | null>;
  findFirst(a: { where: object }): Promise<Row | null>;
  update(a: { where: { id: string }; data: Row }): Promise<Row>;
  delete(a: { where: { id: string } }): Promise<unknown>;
};

export const ENTITIES: Record<
  EntityType,
  { label: string; adminPath: string; publicPaths: string[]; hasTags: boolean; titleField: string }
> = {
  post: { label: "blog post", adminPath: "/admin/posts", publicPaths: ["/blog"], hasTags: true, titleField: "title" },
  page: { label: "page", adminPath: "/admin/pages", publicPaths: ["/about", "/privacy-policy", "/terms-of-service"], hasTags: false, titleField: "title" },
  project: { label: "project", adminPath: "/admin/projects", publicPaths: ["/portfolio"], hasTags: true, titleField: "title" },
  service: { label: "service", adminPath: "/admin/services", publicPaths: ["/services"], hasTags: false, titleField: "title" },
  plan: { label: "plan", adminPath: "/admin/plans", publicPaths: ["/plans", "/plans/enquire"], hasTags: false, titleField: "name" },
};

export const isEntityType = (v: string): v is EntityType => v in ENTITIES;

export function delegate(type: EntityType): Delegate {
  return prisma[type] as unknown as Delegate;
}

const KEEP_REVISIONS = 25;
const STRIP = ["id", "createdAt", "updatedAt", "deletedAt"];

/** Saves the current state of an item so it can be restored later. Call BEFORE overwriting it. */
export async function saveRevision(type: EntityType, id: string, authorName: string, label = "") {
  const cfg = ENTITIES[type];
  const row = await delegate(type).findUnique({
    where: { id },
    ...(cfg.hasTags ? { include: { tags: { select: { id: true } } } } : {}),
  });
  if (!row) return;
  const snapshot: Row = { ...row };
  for (const k of STRIP) delete snapshot[k];
  if (cfg.hasTags) {
    snapshot.tagIds = ((snapshot.tags as { id: string }[] | undefined) ?? []).map((t) => t.id);
    delete snapshot.tags;
  }
  await prisma.revision.create({
    data: { entityType: type, entityId: id, snapshot: JSON.stringify(snapshot), label, authorName },
  });
  const old = await prisma.revision.findMany({
    where: { entityType: type, entityId: id },
    orderBy: { createdAt: "desc" },
    skip: KEEP_REVISIONS,
    select: { id: true },
  });
  if (old.length) await prisma.revision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

export async function listRevisions(type: EntityType, id: string) {
  return prisma.revision.findMany({
    where: { entityType: type, entityId: id },
    orderBy: { createdAt: "desc" },
    take: KEEP_REVISIONS,
    select: { id: true, label: true, authorName: true, createdAt: true, snapshot: true },
  });
}

/** Turns a stored snapshot back into data for `update`. Skips a slug another item now owns. */
export async function snapshotToUpdate(type: EntityType, id: string, raw: string): Promise<Row> {
  const snap = JSON.parse(raw) as Row;
  const data: Row = {};
  for (const [k, v] of Object.entries(snap)) {
    if (k === "tagIds") continue;
    data[k] = typeof v === "string" && k.endsWith("At") ? new Date(v) : v;
  }
  if (typeof data.slug === "string") {
    const clash = await delegate(type).findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (clash) delete data.slug;
  }
  if (ENTITIES[type].hasTags && Array.isArray(snap.tagIds)) {
    data.tags = { set: (snap.tagIds as string[]).map((tid) => ({ id: tid })) };
  }
  return data;
}

/** Short human summary of what a snapshot holds, for the history list. */
export function describeSnapshot(raw: string) {
  try {
    const s = JSON.parse(raw) as Row;
    const len = typeof s.content === "string" ? s.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length : 0;
    return `${s.status === "PUBLISHED" ? "Published" : "Draft"}${len ? `, ${len} words` : ""}`;
  } catch {
    return "";
  }
}

/** Date input helpers shared by the content actions. */
export function parseSchedule(raw: string | undefined, status: "DRAFT" | "PUBLISHED") {
  if (!raw || status !== "PUBLISHED") return { value: null as Date | null };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { error: "Enter a valid publish date." };
  return { value: d.getTime() > Date.now() ? d : null };
}

export function omitSchedule<T extends { scheduledAt?: string }>(d: T): Omit<T, "scheduledAt"> {
  const rest = { ...d };
  delete rest.scheduledAt;
  return rest;
}
