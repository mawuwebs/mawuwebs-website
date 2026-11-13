import "server-only";
import { prisma } from "@/lib/prisma";

export function normalizePath(input: string) {
  let p = input.trim();
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {}
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.toLowerCase();
}

/** Call after a slug changes so the old URL keeps working (301) and old chains stay one hop. */
export async function recordSlugRedirect(prefix: string, oldSlug: string, newSlug: string) {
  if (!oldSlug || oldSlug === newSlug) return;
  const from = normalizePath(`${prefix}/${oldSlug}`);
  const to = normalizePath(`${prefix}/${newSlug}`);
  await prisma.$transaction([
    prisma.redirect.deleteMany({ where: { fromPath: to } }),
    prisma.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } }),
    prisma.redirect.upsert({
      where: { fromPath: from },
      create: { fromPath: from, toPath: to, auto: true },
      update: { toPath: to },
    }),
  ]);
}
